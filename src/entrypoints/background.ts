import { api } from "@/services/api/instance";
import { createSSEMessageHandler } from "@/services/api/sse-message-handler";

// 存储活跃的SSE请求
const activeSSERequests = new Map<string, AbortController>();

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       // 数据在 5 分钟内保持新鲜
//       staleTime: 1000 * 60 * 5,
//       // 缓存数据在 15 分钟后被垃圾回收
//       gcTime: 1000 * 60 * 15, // 更新 gcTime
//       // 失败时默认重试一次
//       retry: 1,
//     },
//     mutations: {
//       // 可以为 mutations 设置默认选项
//     },
//   },
// });

console.log("[Background] QueryClient initialized.");

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  browser.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    console.log("浏览器操作图标被点击", { tabId: tab.id });

    try {
      // 打开侧边栏
      if (tab.id) {
        await browser.sidePanel.open({ tabId: tab.id });
        console.log("侧边栏已打开");
      }
    } catch (error) {
      console.error("打开侧边栏时出错:", error);
    }
  });

  // 添加消息监听器，处理API请求 - 解决CORS问题
  chrome.runtime.onMessage.addListener(
    (
      message: any,
      sender: any,
      sendResponse: (response: any) => void
    ): boolean => {
      // 处理普通API请求
      if (message.type === "API_REQUEST") {
        const { url, method = "GET", data } = message;

        console.log(`[Background] 处理API请求: ${method} ${url}`);

        // 准备headers
        const headers: Record<string, string> = {};

        // 仅为非GET请求添加Content-Type
        if (method !== "GET") {
          headers["Content-Type"] = "application/json";
        }

        // 总是添加Accept头
        headers["Accept"] = "application/json";

        console.log(`[Background] 请求头:`, headers);

        // 使用fetch执行请求
        fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
        })
          .then((response) => response.json())
          .then((result) => {
            console.log("[Background] API响应:", result);
            sendResponse({ success: true, data: result });
          })
          .catch((error) => {
            console.error("[Background] API错误:", error);
            sendResponse({ success: false, error: error.message });
          });

        return true; // 保持消息通道开放
      }

      // 处理SSE流式请求
      if (message.type === "API_SSE_REQUEST") {
        const { requestId, url, config } = message;
        const tabId = sender.tab?.id;

        if (!tabId) {
          console.error("[Background] 无法确定SSE请求的标签页ID");
          return false;
        }

        console.log(`[Background] 处理SSE请求: ${requestId}`, url, config);

        try {
          // 创建AbortController用于取消请求
          const controller = new AbortController();
          activeSSERequests.set(requestId, controller);

          // 创建消息处理器
          const messageHandler = createSSEMessageHandler({
            onData: (section, data) => {
              console.log(`[Background] SSE数据块: ${requestId}`, {
                section,
                data,
              });

              chrome.tabs
                .sendMessage(tabId, {
                  type: "SSE_CHUNK",
                  requestId,
                  data: { section, data },
                })
                .catch((err) => {
                  console.error(
                    `[Background] 发送SSE数据块失败: ${requestId}`,
                    err
                  );
                });
            },
            onError: (error) => {
              console.error(`[Background] SSE错误: ${requestId}`, error);

              chrome.tabs
                .sendMessage(tabId, {
                  type: "SSE_ERROR",
                  requestId,
                  error: error.message || "SSE连接错误",
                })
                .catch((err) => {
                  console.error(
                    `[Background] 发送SSE错误消息失败: ${requestId}`,
                    err
                  );
                });

              // 清理请求
              activeSSERequests.delete(requestId);
            },
            onComplete: () => {
              console.log(`[Background] SSE流正常结束: ${requestId}`);

              chrome.tabs
                .sendMessage(tabId, {
                  type: "SSE_COMPLETE",
                  requestId,
                })
                .catch((err) => {
                  console.error(
                    `[Background] 发送SSE完成消息失败: ${requestId}`,
                    err
                  );
                });

              // 清理请求
              activeSSERequests.delete(requestId);
            },
          });

          // 准备SSE配置
          const sseConfig = {
            ...config,
            signal: controller.signal,
            onChunk: (chunk: any) => {
              console.log("[Background] SSE数据块:", chunk);

              // 检查是否为包含模式信息的新格式数据
              if (chunk && typeof chunk === "object" && "isJsonMode" in chunk) {
                console.log(
                  `[Background] 检测到新格式数据，模式: ${
                    chunk.isJsonMode ? "JSON" : "文本"
                  }`
                );

                if (chunk.isJsonMode) {
                  // JSON模式 - 传递给解析器
                  messageHandler.handleChunk(chunk.content);
                } else {
                  // 文本模式 - 直接发送到前端，绕过解析器
                  console.log(
                    `[Background] 文本模式，直接发送到前端: ${chunk.content.substring(
                      0,
                      50
                    )}...`
                  );
                  chrome.tabs
                    .sendMessage(tabId, {
                      type: "SSE_CHUNK",
                      requestId,
                      data: { text: chunk.content, isTextMode: true },
                    })
                    .catch((err) => {
                      console.error(
                        `[Background] 发送文本模式数据失败: ${requestId}`,
                        err
                      );
                    });
                }
              } else {
                // 兼容旧格式 - 传递给解析器
                messageHandler.handleChunk(chunk);
              }
            },
            onError: (error: any) => {
              messageHandler.handleError(
                error instanceof Error ? error : new Error(String(error))
              );
            },
          };

          // 提取路径部分(去掉基础URL)
          const path = new URL(url).pathname + new URL(url).search;

          // 使用API客户端的sse方法发起请求
          console.log(
            `[Background] 启动SSE请求: ${requestId}`,
            path,
            sseConfig
          );
          const stream = api.sse(path, sseConfig);

          // 处理流结束
          const reader = stream.getReader();
          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                console.log(`[Background] SSE读取数据: ${requestId}`, {
                  done,
                  value,
                });
                if (done) break;
              }
            } catch (error) {
              console.error(`[Background] SSE读取错误: ${requestId}`, error);
              messageHandler.handleError(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          })();
        } catch (error) {
          console.error(`[Background] 启动SSE请求失败: ${requestId}`, error);

          chrome.tabs
            .sendMessage(tabId, {
              type: "SSE_ERROR",
              requestId,
              error: error instanceof Error ? error.message : "启动SSE连接失败",
            })
            .catch((err) => {
              console.error(
                `[Background] 发送SSE错误消息失败: ${requestId}`,
                err
              );
            });
        }

        return false; // 不保持消息通道开放，使用单向消息
      }

      // 处理取消SSE请求
      if (message.type === "API_SSE_CANCEL") {
        const { requestId } = message;
        console.log(`[Background] 取消SSE请求: ${requestId}`);

        const controller = activeSSERequests.get(requestId);
        if (controller) {
          controller.abort();
          activeSSERequests.delete(requestId);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "未找到活跃的SSE请求" });
        }

        return false;
      }

      return false;
    }
  );

  console.log("[Background] Message listener attached.");
});
