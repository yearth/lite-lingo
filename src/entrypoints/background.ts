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

  // 添加消息监听器
  chrome.runtime.onMessage.addListener(
    (
      message: any,
      sender: any,
      sendResponse: (response: any) => void
    ): boolean => {
      return true;
    }
  );

  console.log("[Background] Message listener attached.");
});
