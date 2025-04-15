import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据在 5 分钟内保持新鲜
      staleTime: 1000 * 60 * 5,
      // 缓存数据在 15 分钟后被垃圾回收
      gcTime: 1000 * 60 * 15, // 更新 gcTime
      // 失败时默认重试一次
      retry: 1,
    },
    mutations: {
      // 可以为 mutations 设置默认选项
    },
  },
});

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
      // 处理API请求
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

      return true;
    }
  );

  console.log("[Background] Message listener attached.");
});
