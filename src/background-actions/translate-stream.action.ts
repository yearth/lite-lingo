import {
  BackgroundResponseMessage,
  ContentScriptStreamMessage, // Add import
  MSG_TYPE_STREAM_ERROR,
  MSG_TYPE_TEXT_CHUNK_RECEIVED, // Add import
  StreamErrorPayload,
  TextChunkPayload,
  TranslateStreamPayload
} from "../types/messaging";
// Import StreamEventPayload correctly now
import apiClient, { ApiResponse, SseCallbacks, StreamEventPayload } from "../utils/api-client";

// Define a simple success data type for the initial response
interface StreamInitiatedData {
  message: string; // Or leave empty if no specific data needed
}

export async function handleTranslateStream(
  payload: TranslateStreamPayload,
  sender: chrome.runtime.MessageSender,
  sendResponse: (
    response: BackgroundResponseMessage<StreamInitiatedData>
  ) => void
): Promise<void> {
  const tabId = sender.tab?.id;

  console.log(
    `[Action: TranslateStream] Handling request for tab ${tabId}`,
    payload
  );

  if (!tabId) {
    console.error(
      "[Action: TranslateStream] Cannot start stream: sender tab ID is missing."
    );
    // Send immediate error response
    sendResponse({ success: false, error: "Sender tab ID is missing." });
    // No need to return true from listener in this case, but this function completes.
    return;
  }

  // Define callbacks for apiClient.sse
  const callbacks: SseCallbacks = {
    // Use the imported StreamEventPayload type, but acknowledge the actual payload structure might differ
    // We'll access properties carefully or use type assertions if needed.
    onMessage: (apiResponse: ApiResponse<StreamEventPayload<any>>) => { // Use StreamEventPayload
      // Check for API-level errors first (non-"0" code)
      if (apiResponse.code !== "0" && apiResponse.code !== 0) {
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
      if (apiResponse.data && typeof (apiResponse.data as any).text === 'string') {
        const textChunk = (apiResponse.data as any).text; // Cast to any to access .text

        const chunkMessage: ContentScriptStreamMessage<TextChunkPayload> = {
          type: MSG_TYPE_TEXT_CHUNK_RECEIVED,
          payload: { text: textChunk },
        };

        console.log(`[Action: TranslateStream] Forwarding text chunk to tab ${tabId}: "${textChunk.substring(0, 30)}..."`); // Reduce verbosity
        
        chrome.tabs.sendMessage(tabId, chunkMessage)
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
    },
    onClose: () => {
      console.log(
        `[Action: TranslateStream] SSE connection closed for tab ${tabId}`
      );
      // Optionally send a specific message on close if needed
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
    // signal: controller.signal // Add AbortController signal if cancellation is needed
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
  }
  // The background listener must return true because processing continues in callbacks.
}
