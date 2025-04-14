import {
  BackgroundResponseMessage,
  CancelTranslationPayload,
  ContentScriptStreamMessage,
  MSG_TYPE_STREAM_DONE_V2,
  MSG_TYPE_STREAM_ERROR,
  MSG_TYPE_TEXT_CHUNK_RECEIVED,
  StreamCompletePayload,
  StreamErrorPayload,
  TextChunkPayload,
  TranslateStreamPayload,
} from "../types/messaging";
// Import StreamEventPayload correctly now
import apiClient from "../utils/api-client";

// Define a simple success data type for the initial response
interface StreamInitiatedData {
  message: string; // Or leave empty if no specific data needed
}

// 存储活跃的翻译流控制器，以便后续能够取消
const activeTranslationControllers = new Map<number, AbortController>();

export async function handleTranslateStream(
  payload: TranslateStreamPayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (
    response: BackgroundResponseMessage<StreamInitiatedData>
  ) => void
): Promise<void> {
  console.log("[Action: TranslateStream] Handling translation stream request");

  // 验证 sender 和 tabId - 需要有效的标签页 ID 来发送结果
  if (!sender.tab?.id) {
    console.error(
      "[Action: TranslateStream] No valid tab ID in sender",
      sender
    );
    sendResponse({
      success: false,
      error: "Cannot process request: no valid tab ID found",
    });
    return;
  }

  const tabId = sender.tab.id;
  console.log(`[Action: TranslateStream] Processing for tab ${tabId}`);

  // 创建 AbortController 以支持取消
  const controller = new AbortController();

  // 存储控制器以便稍后取消
  activeTranslationControllers.set(tabId, controller);

  // Define SSE callbacks
  const callbacks = {
    onMessage: (apiResponse: any) => {
      if (!apiResponse.ok) {
        // Handle API error responses specifically
        console.error(
          `[Action: TranslateStream V2] SSE stream error for tab ${tabId}: [${apiResponse.code}] ${apiResponse.message}`
        );
        const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> = {
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
              `[Action: TranslateStream V2] Failed to send stream error to tab ${tabId}: ${err.message}`
            )
          );
        return; // Stop processing this message
      }

      // Process successful data: Extract the text chunk and forward it.
      // Accessing apiResponse.data.payload.text based on StreamEventPayload structure
      // and assuming the backend sends text within the 'payload' field of StreamEventPayload.
      // If backend sends { type: 'text', text: '...' } directly in apiResponse.data, adjust access.
      // Let's assume the structure from backend is actually fitting StreamEventPayload:
      // { type: 'text_chunk', payload: { text: '...' } } -> This seems unlikely based on previous backend code.
      // Let's revert to accessing apiResponse.data.text directly, assuming apiResponse.data is the object { type, text, model }
      if (
        apiResponse.data &&
        typeof (apiResponse.data as any).text === "string"
      ) {
        const textChunk = (apiResponse.data as any).text; // Cast to any to access .text

        const chunkMessage: ContentScriptStreamMessage<TextChunkPayload> = {
          type: MSG_TYPE_TEXT_CHUNK_RECEIVED,
          payload: { text: textChunk },
        };

        console.log(
          `[Action: TranslateStream] Forwarding text chunk to tab ${tabId}: "${textChunk.substring(
            0,
            30
          )}..."`
        ); // Reduce verbosity

        chrome.tabs
          .sendMessage(tabId, chunkMessage)
          .catch((err) =>
            console.warn(
              `[Action: TranslateStream] Failed to send text chunk to tab ${tabId}: ${err.message}`
            )
          );
      } else if (apiResponse.data) {
        // Handle potential errors reported within the stream data itself if backend sends them
        // Example: if (apiResponse.data.type === 'error') { ... send MSG_TYPE_STREAM_ERROR ... }
        // For now, just log unexpected data structures
        console.warn(
          `[Action: TranslateStream] Received unexpected data structure in stream for tab ${tabId}:`,
          apiResponse.data // Log the whole data part
        );
      }
    },
    onError: (error: Error) => {
      console.error(
        `[Action: TranslateStream] SSE connection/processing error for tab ${tabId}:`,
        error
      );
      const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> = {
        type: MSG_TYPE_STREAM_ERROR,
        payload: { error: error.message || "SSE connection failed" },
      };
      // Check if tab still exists before sending message
      chrome.tabs
        .get(tabId)
        .then(() => {
          chrome.tabs
            .sendMessage(tabId, errorMessage)
            .catch((err) =>
              console.warn(
                `[Action: TranslateStream] Failed to send connection error to tab ${tabId}: ${err.message}`
              )
            );
        })
        .catch(() => {
          console.warn(
            `[Action: TranslateStream] Tab ${tabId} not found, cannot send SSE connection error.`
          );
        });

      // 清理控制器映射
      activeTranslationControllers.delete(tabId);
    },
    onClose: () => {
      console.log(
        `[Action: TranslateStream] SSE connection closed for tab ${tabId}`
      );

      // 发送完成消息
      const doneMessage: ContentScriptStreamMessage<StreamCompletePayload> = {
        type: MSG_TYPE_STREAM_DONE_V2,
        payload: { status: "completed" },
      };

      chrome.tabs
        .sendMessage(tabId, doneMessage)
        .catch((err) =>
          console.warn(
            `[Action: TranslateStream] Failed to send completion message to tab ${tabId}: ${err.message}`
          )
        );

      // 清理控制器映射
      activeTranslationControllers.delete(tabId);
    },
  };

  // Prepare request options for apiClient.sse
  const requestOptions: RequestInit = {
    method: "POST",
    body: JSON.stringify({
      text: payload.text,
      context: payload.context,
      targetLanguage: payload.targetLanguage,
      provider: "deepseek", // Consider making these configurable if needed
      model: "deepseek-chat",
    }),
    signal: controller.signal, // 添加 AbortController 信号以支持取消
  };

  // Call apiClient.sse and handle initial response
  try {
    await apiClient.sse("/v2/translate/stream", requestOptions, callbacks);
    console.log(
      `[Action: TranslateStream] apiClient.sse initiated successfully for tab ${tabId}.`
    );
    // Acknowledge the request initiation successfully.
    sendResponse({ success: true, data: { message: "Stream initiated" } });
  } catch (initialError: any) {
    console.error(
      `[Action: TranslateStream] Failed to initiate apiClient.sse for tab ${tabId}:`,
      initialError
    );
    // Send failure response for the initial request
    sendResponse({
      success: false,
      error: `Failed to initiate stream: ${initialError.message}`,
    });

    // 清理控制器映射
    activeTranslationControllers.delete(tabId);
  }
  // The background listener must return true because processing continues in callbacks.
}

/**
 * 取消正在进行的翻译流
 */
export async function cancelTranslationStream(
  payload: CancelTranslationPayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (
    response: BackgroundResponseMessage<{ cancelled: boolean }>
  ) => void
): Promise<void> {
  // 验证 sender 和 tabId
  if (!sender.tab?.id) {
    console.error(
      "[Action: CancelTranslation] No valid tab ID in sender",
      sender
    );
    sendResponse({
      success: false,
      error: "Cannot process request: no valid tab ID found",
    });
    return;
  }

  const tabId = sender.tab.id;
  console.log(
    `[Action: CancelTranslation] Processing cancellation for tab ${tabId}, reason: ${
      payload.reason || "not specified"
    }`
  );

  // 获取并使用控制器取消流
  const controller = activeTranslationControllers.get(tabId);
  if (controller) {
    // 取消流
    controller.abort();
    console.log(
      `[Action: CancelTranslation] Successfully aborted translation stream for tab ${tabId}`
    );

    // 从映射中删除控制器
    activeTranslationControllers.delete(tabId);

    // 发送成功响应
    sendResponse({
      success: true,
      data: { cancelled: true },
    });
  } else {
    // 没有找到活跃的流，可能已经结束
    console.log(
      `[Action: CancelTranslation] No active translation stream found for tab ${tabId}`
    );
    sendResponse({
      success: true,
      data: { cancelled: false },
    });
  }
}
