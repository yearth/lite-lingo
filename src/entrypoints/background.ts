import { QueryClient } from "@tanstack/react-query";
import {
  AddWordPayload,
  BackgroundRequestMessage,
  BackgroundResponseMessage,
  MSG_TYPE_MUTATION_ADD_WORD,
  MSG_TYPE_MUTATION_REQUEST_TTS,
  MSG_TYPE_MUTATION_TRANSLATE_STREAM,
  MSG_TYPE_QUERY_FETCH_NOTEBOOK,
  RequestTtsPayload,
  TranslateStreamPayload,
} from "../types/messaging";

// Import action handlers
import { handleAddWord } from "../background-actions/add-word.action";
import { handleFetchNotebook } from "../background-actions/fetch-notebook.action";
import { handleRequestTts } from "../background-actions/request-tts.action";
import { handleTranslateStream } from "../background-actions/translate-stream.action";

console.log(
  "[Background] Script loaded via defineBackground. Initializing QueryClient..."
);

// 实例化全局唯一的 QueryClient
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

  // 监听浏览器操作图标的点击事件
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
      message: BackgroundRequestMessage, // 使用泛型接口
      sender: chrome.runtime.MessageSender, // 添加 sender 类型
      sendResponse: (response: BackgroundResponseMessage) => void
    ): boolean => {
      // 必须返回 boolean
      console.log(
        `[Background] Received message type: ${message.type}`,
        "Payload:",
        message.payload,
        "From:",
        sender.tab?.id,
        sender.frameId
      );

      // --- Route message to the appropriate handler ---
      console.log(`[Background] Routing message type: ${message.type}`);

      switch (message.type) {
        case MSG_TYPE_QUERY_FETCH_NOTEBOOK:
          // No specific payload expected for this type usually
          handleFetchNotebook(message.payload, queryClient, sendResponse);
          break;
        case MSG_TYPE_MUTATION_ADD_WORD:
          handleAddWord(
            message.payload as AddWordPayload, // Assert payload type
            queryClient,
            sendResponse
          );
          break;
        case MSG_TYPE_MUTATION_REQUEST_TTS:
          handleRequestTts(
            message.payload as RequestTtsPayload, // Assert payload type
            sendResponse
          );
          break;
        case MSG_TYPE_MUTATION_TRANSLATE_STREAM:
          handleTranslateStream(
            message.payload as TranslateStreamPayload, // Assert payload type
            sender, // Pass sender for tabId access
            sendResponse // Pass sendResponse for initial ack/error
          );
          break;
        default:
          console.warn(
            "[Background] Received unknown message type:",
            message.type
          );
          // Optionally send an error response for unhandled types
          // sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
          // If sending a synchronous response, return false
          return false; // Don't keep the channel open for unhandled types
      }

      // --- IMPORTANT: Return true to indicate asynchronous response ---
      // This is necessary for all cases handled above as they involve async operations
      // (fetchQuery, apiClient calls, chrome.tts.speak, apiClient.sse).
      // The 'default' case returns false explicitly.
      return true;
    }
  );

  console.log("[Background] Message listener attached.");
});
