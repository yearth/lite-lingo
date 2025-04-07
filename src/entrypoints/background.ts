import { QueryClient } from "@tanstack/react-query";
import {
  AddWordPayload, // 导入响应类型
  AddWordSuccessData,
  BackgroundRequestMessage,
  BackgroundResponseMessage,
  ContentScriptStreamMessage, // Added missing type
  MSG_TYPE_MUTATION_ADD_WORD,
  MSG_TYPE_MUTATION_REQUEST_TTS,
  MSG_TYPE_MUTATION_TRANSLATE_STREAM,
  MSG_TYPE_QUERY_FETCH_NOTEBOOK,
  MSG_TYPE_STREAM_CHUNK, // Added
  MSG_TYPE_STREAM_COMPLETE, // Added
  MSG_TYPE_STREAM_ERROR, // Added
  RequestTtsPayload,
  StreamChunkPayload, // Added
  StreamErrorPayload, // Added

  // TtsSuccessData, // Removed if using chrome.tts directly
  TranslateStreamPayload,
  YourWordType,
} from "../types/messaging";
import apiClient, { SseCallbacks } from "../utils/api-client"; // Import SseCallbacks as well
// Removed import for handleStreamTranslationApiCall

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

      // --- 根据消息类型路由 ---

      if (message.type === MSG_TYPE_QUERY_FETCH_NOTEBOOK) {
        console.log("[Background] Handling request to fetch notebook...");
        const queryKey = ["notebook", "list"]; // 定义查询键

        const queryFn = async (): Promise<YourWordType[]> => {
          console.log("[Background] Executing queryFn for notebook list...");
          // 假设获取列表的 API 是 GET /notebook
          // 并且 apiClient.standard 能正确处理返回结构并提取 data
          return await apiClient.standard<YourWordType[]>("/notebook", {
            method: "GET",
          });
        };

        queryClient
          .fetchQuery({ queryKey, queryFn })
          .then((data: YourWordType[] | null) => {
            // Add type annotation, handle potential null
            console.log(
              "[Background] Successfully fetched notebook list:",
              data?.length,
              "items"
            );
            sendResponse({ success: true, data });
          })
          .catch((error: Error) => {
            console.error("[Background] Failed to fetch notebook list:", error);
            sendResponse({
              success: false,
              error: error.message || "Failed to fetch notebook",
            });
          });
        // return true 已在监听器末尾处理
      } else if (message.type === MSG_TYPE_MUTATION_ADD_WORD) {
        const payload = message.payload as AddWordPayload;
        console.log("[Background] Handling request to add word:", payload.word);

        // 假设添加单词的 API 是 POST /notebook/words
        apiClient
          .standard<AddWordSuccessData>("/notebook/words", {
            method: "POST",
            body: JSON.stringify({
              word: payload.word,
              translation: payload.translation,
              context: payload.context,
              // 其他字段...
            }),
          })
          .then((data: AddWordSuccessData | null) => {
            // Add type annotation, handle potential null
            console.log("[Background] Successfully added word:", data);
            // --- 使查询缓存失效 ---
            console.log(
              "[Background] Invalidating notebook list query cache..."
            );
            queryClient.invalidateQueries({ queryKey: ["notebook", "list"] });
            // ----------------------
            sendResponse({ success: true, data });
          })
          .catch((error: Error) => {
            console.error("[Background] Failed to add word:", error);
            sendResponse({
              success: false,
              error: error.message || "Failed to add word",
            });
          });
        // return true is handled at the end
      } else if (message.type === MSG_TYPE_MUTATION_REQUEST_TTS) {
        const payload = message.payload as RequestTtsPayload;
        console.log(
          "[Background] Handling request for TTS via chrome.tts:",
          payload.text
        );

        // Use chrome.tts API
        chrome.tts.speak(
          payload.text,
          {
            lang: payload.language === "zh" ? "zh-CN" : "en-US", // Map language code
            onEvent: (event) => {
              if (event.type === "error") {
                console.error(
                  "[Background] chrome.tts error:",
                  event.errorMessage
                );
                // Note: We already sent the initial success response.
                // Error handling here is mostly for logging or potentially
                // sending another message if complex state management is needed.
              } else if (event.type === "end") {
                console.log("[Background] chrome.tts finished speaking.");
              }
            },
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "[Background] Failed to initiate chrome.tts:",
                chrome.runtime.lastError.message
              );
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              console.log(
                "[Background] chrome.tts request initiated successfully."
              );
              // Send success response immediately for initiating the request
              sendResponse({
                success: true,
                data: { message: "TTS initiated" },
              });
            }
          }
        );
        // return true is handled at the end
      } else if (message.type === MSG_TYPE_MUTATION_TRANSLATE_STREAM) {
        const payload = message.payload as TranslateStreamPayload;
        const tabId = sender.tab?.id;

        console.log(
          `[Background] Handling request to start translation stream for tab ${tabId}`,
          payload
        );

        if (!tabId) {
          console.error(
            "[Background] Cannot start stream: sender tab ID is missing."
          );
          sendResponse({ success: false, error: "Sender tab ID is missing." });
          return false; // Return false as we are responding synchronously with an error
        }

        // Define callbacks for apiClient.sse directly here
        const callbacks: SseCallbacks = {
          onMessage: (apiResponse) => {
            if (apiResponse.code !== "0" && apiResponse.code !== 0) {
              console.error(
                `[Background] SSE stream error for tab ${tabId}: [${apiResponse.code}] ${apiResponse.message}`
              );
              const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> =
                {
                  type: MSG_TYPE_STREAM_ERROR,
                  payload: {
                    error:
                      `[${apiResponse.code}] ${apiResponse.message}` ||
                      "Unknown stream error",
                  },
                };
              chrome.tabs
                .sendMessage(tabId, errorMessage)
                .catch((err) =>
                  console.warn(
                    `Failed to send stream error to tab ${tabId}: ${err.message}`
                  )
                );
              return;
            }
            if (apiResponse.data) {
              const streamEvent = apiResponse.data;
              switch (streamEvent.type) {
                case "text_chunk":
                  if (streamEvent.payload?.text) {
                    const chunkMessage: ContentScriptStreamMessage<StreamChunkPayload> =
                      {
                        type: MSG_TYPE_STREAM_CHUNK,
                        payload: { chunk: streamEvent.payload.text },
                      };
                    chrome.tabs
                      .sendMessage(tabId, chunkMessage)
                      .catch((err) =>
                        console.warn(
                          `Failed to send chunk to tab ${tabId}: ${err.message}`
                        )
                      );
                  }
                  break;
                case "done":
                  console.log(
                    `[Background] SSE stream finished for tab ${tabId}:`,
                    streamEvent.payload?.status
                  );
                  const completeMessage: ContentScriptStreamMessage<void> = {
                    type: MSG_TYPE_STREAM_COMPLETE,
                    payload: undefined,
                  };
                  chrome.tabs
                    .sendMessage(tabId, completeMessage)
                    .catch((err) =>
                      console.warn(
                        `Failed to send completion to tab ${tabId}: ${err.message}`
                      )
                    );
                  break;
                case "error":
                  console.error(
                    `[Background] SSE stream reported error for tab ${tabId}:`,
                    streamEvent.payload?.message
                  );
                  const streamErrorMessage: ContentScriptStreamMessage<StreamErrorPayload> =
                    {
                      type: MSG_TYPE_STREAM_ERROR,
                      payload: {
                        error:
                          streamEvent.payload?.message ||
                          "Unknown stream error event",
                      },
                    };
                  chrome.tabs
                    .sendMessage(tabId, streamErrorMessage)
                    .catch((err) =>
                      console.warn(
                        `Failed to send stream error event to tab ${tabId}: ${err.message}`
                      )
                    );
                  break;
                default:
                  console.warn(
                    `[Background] Received unknown SSE event type for tab ${tabId}:`,
                    streamEvent.type
                  );
              }
            }
          },
          onError: (error) => {
            console.error(
              `[Background] SSE connection/processing error for tab ${tabId}:`,
              error
            );
            const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> =
              {
                type: MSG_TYPE_STREAM_ERROR,
                payload: { error: error.message || "SSE connection failed" },
              };
            chrome.tabs
              .get(tabId)
              .then(() => {
                chrome.tabs
                  .sendMessage(tabId, errorMessage)
                  .catch((err) =>
                    console.warn(
                      `Failed to send connection error to tab ${tabId}: ${err.message}`
                    )
                  );
              })
              .catch(() => {
                console.warn(
                  `[Background] Tab ${tabId} not found, cannot send SSE connection error.`
                );
              });
          },
          onClose: () => {
            console.log(`[Background] SSE connection closed for tab ${tabId}`);
          },
        };

        // Prepare request options for apiClient.sse
        const requestOptions: RequestInit = {
          method: "POST",
          body: JSON.stringify({
            text: payload.text,
            context: payload.context,
            targetLanguage: payload.targetLanguage,
            provider: "deepseek", // Default provider
            model: "deepseek-chat", // Default model
          }),
          // signal: controller.signal // Add AbortController signal if cancellation is needed
        };

        // Call apiClient.sse
        apiClient
          .sse("/translate/stream", requestOptions, callbacks)
          .then(() => {
            console.log(
              `[Background] apiClient.sse initiated successfully for tab ${tabId}.`
            );
            // Acknowledge the request initiation successfully.
            // The actual events are handled via callbacks.
            sendResponse({ success: true });
          })
          .catch((initialError: Error) => {
            console.error(
              `[Background] Failed to initiate apiClient.sse for tab ${tabId}:`,
              initialError
            );
            // Send failure response for the initial request
            sendResponse({
              success: false,
              error: `Failed to initiate stream: ${initialError.message}`,
            });
          });

        // return true is handled at the end (as apiClient.sse is async)
      } else {
        console.warn(
          "[Background] Received unknown message type:",
          message.type
        );
        // 对于未知类型，可以选择立即回复错误或忽略
        // sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        // return false; // 如果同步回复错误，则返回 false
      }

      // --- 关键: 返回 true 允许异步调用 sendResponse ---
      return true;
    }
  ); // 正确结束 addListener

  console.log("[Background] Message listener attached."); // 移到 addListener 外部
});
