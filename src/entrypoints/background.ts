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

// 添加接口定义
interface JsonModeChunk {
  isJsonMode: boolean;
  content: any;
}

// 文本块大小限制
const MAX_TEXT_CHUNK_SIZE = 1000;

// 流错误类型
enum StreamErrorType {
  ABORTED = "ABORTED",
  TIMEOUT = "TIMEOUT",
  NETWORK = "NETWORK",
  PARSE = "PARSE",
  UNKNOWN = "UNKNOWN",
}

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
              handleStreamError(error, requestId, tabId);
              // 清理请求
              activeSSERequests.delete(requestId);
            },
            onComplete: () => {
              notifyStreamComplete(requestId, tabId);
              // 清理请求
              activeSSERequests.delete(requestId);
            },
          });

          // 准备SSE配置
          const sseConfig = {
            ...config,
            signal: controller.signal,
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

          // 处理流
          const reader = stream.getReader();
          handleSSEStream(reader, requestId, tabId, messageHandler);
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

/**
 * 处理SSE流数据
 */
async function handleSSEStream(
  reader: ReadableStreamDefaultReader<any>,
  requestId: string,
  tabId: number,
  messageHandler: any
) {
  try {
    // 主处理循环
    while (true) {
      // 读取数据块
      const { done, value } = await reader.read();

      // 记录数据
      logStreamData(requestId, done, value);

      // 检查流是否结束
      if (done) {
        console.log(`[Background] SSE流结束: ${requestId}`);
        break;
      }

      // 验证数据格式
      if (!isValidStreamData(value)) {
        logInvalidData(requestId, value);
        continue;
      }

      // 根据模式处理数据
      await processStreamData(value, requestId, tabId, messageHandler);
    }

    // 处理流正常结束
    notifyStreamComplete(requestId, tabId);
  } catch (error) {
    // 处理流错误
    handleStreamError(error, requestId, tabId, messageHandler);
  }
}

/**
 * 记录流数据
 */
function logStreamData(requestId: string, done: boolean, value: any) {
  if (value && !done) {
    console.log(`[Background] SSE读取数据: ${requestId}`, {
      done,
      value: typeof value === "object" ? `[Object]` : value,
      size: JSON.stringify(value).length,
    });
  } else {
    console.log(`[Background] SSE读取数据: ${requestId}`, { done });
  }
}

/**
 * 验证数据格式
 */
function isValidStreamData(value: any): boolean {
  return (
    value &&
    typeof value === "object" &&
    "isJsonMode" in value &&
    typeof value.isJsonMode === "boolean" &&
    "content" in value
  );
}

/**
 * 记录无效数据
 */
function logInvalidData(requestId: string, value: any) {
  console.warn(`[Background] 收到非预期格式数据: ${requestId}`, {
    type: typeof value,
    value: value ? JSON.stringify(value).substring(0, 100) : "null",
    hasIsJsonMode:
      value && typeof value === "object" ? "isJsonMode" in value : false,
  });
}

/**
 * 处理流数据
 */
async function processStreamData(
  value: any,
  requestId: string,
  tabId: number,
  messageHandler: any
) {
  const chunk = value as JsonModeChunk;
  const mode = chunk.isJsonMode ? "JSON" : "文本";

  console.log(`[Background] 处理${mode}模式数据: ${requestId}`);

  if (chunk.isJsonMode) {
    // 处理JSON模式数据
    await messageHandler.handleChunk(chunk.content);
  } else {
    // 处理文本模式数据
    await processTextModeData(chunk.content, requestId, tabId);
  }
}

/**
 * 处理文本模式数据
 */
async function processTextModeData(
  content: any,
  requestId: string,
  tabId: number
) {
  // 确保content是字符串
  const textContent =
    typeof content === "string" ? content : JSON.stringify(content);

  // 判断是否需要分片处理
  if (textContent.length <= MAX_TEXT_CHUNK_SIZE) {
    // 小文本直接发送
    await sendTextContent(textContent, requestId, tabId);
    return;
  }

  // 对大文本进行分片处理
  console.log(
    `[Background] 大型文本(${textContent.length}字符)将分片处理: ${requestId}`
  );
  await processLargeTextContent(textContent, requestId, tabId);
}

/**
 * 发送文本内容
 */
async function sendTextContent(
  text: string,
  requestId: string,
  tabId: number
): Promise<void> {
  try {
    console.log(
      `[Background] 文本模式，发送到前端: ${requestId}`,
      text.substring(0, 50) + (text.length > 50 ? "..." : "")
    );

    await chrome.tabs.sendMessage(tabId, {
      type: "SSE_CHUNK",
      requestId,
      data: { text, isTextMode: true },
    });
  } catch (err) {
    console.error(`[Background] 发送文本模式数据失败: ${requestId}`, err);
  }
}

/**
 * 处理大型文本
 */
async function processLargeTextContent(
  content: string,
  requestId: string,
  tabId: number
) {
  let position = 0;
  let chunkIndex = 0;

  while (position < content.length) {
    // 计算当前块的结束位置
    const end = Math.min(position + MAX_TEXT_CHUNK_SIZE, content.length);

    // 尝试在句子边界切分
    let segmentEnd = end;
    if (end < content.length) {
      // 查找句号、问号、感叹号等断句标记
      const sentenceBreaks = [".", "?", "!", "。", "？", "！", "\n"];
      for (let i = end; i > position && i > end - 100; i--) {
        if (sentenceBreaks.includes(content[i])) {
          segmentEnd = i + 1;
          break;
        }
      }
    }

    const chunk = content.substring(position, segmentEnd);

    // 发送当前块
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_CHUNK",
        requestId,
        data: {
          text: chunk,
          isTextMode: true,
          isPartial: segmentEnd < content.length,
          chunkIndex: chunkIndex++,
        },
      });
    } catch (err) {
      console.error(`[Background] 发送文本块失败: ${requestId}`, err);
      break;
    }

    position = segmentEnd;

    // 如果还有更多块，添加小延迟避免UI阻塞
    if (position < content.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // 发送分片完成消息
  if (chunkIndex > 1) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_TEXT_COMPLETE",
        requestId,
        data: { totalChunks: chunkIndex },
      });
    } catch (err) {
      console.error(`[Background] 发送文本完成消息失败: ${requestId}`, err);
    }
  }
}

/**
 * 处理流错误
 */
function handleStreamError(
  error: any,
  requestId: string,
  tabId: number,
  messageHandler?: any
) {
  // 记录详细的错误信息
  console.error(`[Background] SSE错误: ${requestId}`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  });

  // 错误类型区分
  let errorType = StreamErrorType.UNKNOWN;
  let userMessage = "翻译过程中发生错误";

  if (error.name === "AbortError") {
    errorType = StreamErrorType.ABORTED;
    userMessage = "翻译已取消";
  } else if (error.message?.includes("timeout")) {
    errorType = StreamErrorType.TIMEOUT;
    userMessage = "翻译请求超时";
  } else if (
    error.message?.includes("network") ||
    error.message?.includes("fetch")
  ) {
    errorType = StreamErrorType.NETWORK;
    userMessage = "网络连接错误";
  } else if (
    error.message?.includes("parse") ||
    error.message?.includes("JSON")
  ) {
    errorType = StreamErrorType.PARSE;
    userMessage = "数据解析错误";
  }

  // 如果有messageHandler，先通过它处理
  if (messageHandler?.handleError) {
    messageHandler.handleError(error);
  }

  // 向前端发送结构化错误
  chrome.tabs
    .sendMessage(tabId, {
      type: "SSE_ERROR",
      requestId,
      error: {
        type: errorType,
        message: userMessage,
        details: error.message,
      },
    })
    .catch((err) => {
      console.error(`[Background] 发送错误信息失败: ${requestId}`, err);
    });
}

/**
 * 通知流完成
 */
function notifyStreamComplete(requestId: string, tabId: number) {
  console.log(`[Background] SSE流正常结束: ${requestId}`);

  chrome.tabs
    .sendMessage(tabId, {
      type: "SSE_COMPLETE",
      requestId,
    })
    .catch((err) => {
      console.error(`[Background] 发送SSE完成消息失败: ${requestId}`, err);
    });
}
