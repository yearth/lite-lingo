import {
  ContentScriptStreamMessage,
  MSG_TYPE_STREAM_CHUNK,
  MSG_TYPE_STREAM_COMPLETE,
  MSG_TYPE_STREAM_ERROR,
  StreamChunkPayload,
  StreamErrorPayload,
  TranslateStreamPayload,
} from "../types/messaging";
import apiClient, { SseCallbacks } from "./api-client"; // Import the new apiClient and SseCallbacks

/**
 * Handles the streaming translation API call using apiClient.sse.
 * This function should:
 * 1. Initiate the API call (e.g., using fetch with ReadableStream).
 * 2. Read chunks from the stream.
 * 3. Send chunks back to the content script via chrome.tabs.sendMessage using MSG_TYPE_STREAM_CHUNK.
 * 4. Send errors back via chrome.tabs.sendMessage using MSG_TYPE_STREAM_ERROR.
 */
export const handleStreamTranslationApiCall = async (
  payload: TranslateStreamPayload,
  targetTabId: number
): Promise<void> => {
  console.log(
    `[Background] Initiating stream translation via apiClient.sse for tab ${targetTabId}`,
    payload
  );

  // Define callbacks for apiClient.sse
  const callbacks: SseCallbacks = {
    onOpen: () => {
      console.log(`[Background] SSE connection opened for tab ${targetTabId}`);
      // Optional: Send an 'open' status message back if needed
    },
    onMessage: (apiResponse) => {
      // console.log(`[Background] Received SSE message for tab ${targetTabId}:`, apiResponse); // Debug log

      // Check for business errors within the stream
      if (apiResponse.code !== "0" && apiResponse.code !== 0) {
        console.error(
          `[Background] SSE stream error for tab ${targetTabId}: [${apiResponse.code}] ${apiResponse.message}`
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
          .sendMessage(targetTabId, errorMessage)
          .catch((err) =>
            console.warn(
              `Failed to send stream error to tab ${targetTabId}: ${err.message}`
            )
          );
        return; // Stop processing this message
      }

      // Process successful data messages
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
                .sendMessage(targetTabId, chunkMessage)
                .catch((err) =>
                  console.warn(
                    `Failed to send chunk to tab ${targetTabId}: ${err.message}`
                  )
                );
            }
            break;
          case "done":
            console.log(
              `[Background] SSE stream finished for tab ${targetTabId}:`,
              streamEvent.payload?.status
            );
            const completeMessage: ContentScriptStreamMessage<void> = {
              type: MSG_TYPE_STREAM_COMPLETE,
              payload: undefined,
            };
            chrome.tabs
              .sendMessage(targetTabId, completeMessage)
              .catch((err) =>
                console.warn(
                  `Failed to send completion to tab ${targetTabId}: ${err.message}`
                )
              );
            break;
          case "error": // Handle errors reported within the stream data structure
            console.error(
              `[Background] SSE stream reported error for tab ${targetTabId}:`,
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
              .sendMessage(targetTabId, streamErrorMessage)
              .catch((err) =>
                console.warn(
                  `Failed to send stream error event to tab ${targetTabId}: ${err.message}`
                )
              );
            break;
          default:
            console.warn(
              `[Background] Received unknown SSE event type for tab ${targetTabId}:`,
              streamEvent.type
            );
        }
      }
    },
    onError: (error) => {
      console.error(
        `[Background] SSE connection/processing error for tab ${targetTabId}:`,
        error
      );
      const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> = {
        type: MSG_TYPE_STREAM_ERROR,
        payload: { error: error.message || "SSE connection failed" },
      };
      // Check if tab still exists before sending
      chrome.tabs
        .get(targetTabId)
        .then(() => {
          chrome.tabs
            .sendMessage(targetTabId, errorMessage)
            .catch((err) =>
              console.warn(
                `Failed to send connection error to tab ${targetTabId}: ${err.message}`
              )
            );
        })
        .catch(() => {
          console.warn(
            `[Background] Tab ${targetTabId} not found, cannot send SSE connection error.`
          );
        });
    },
    onClose: () => {
      console.log(`[Background] SSE connection closed for tab ${targetTabId}`);
      // Optional: Send a 'close' status message back if needed,
      // but 'done' or 'error' messages usually suffice.
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
  // Note: apiClient.sse itself is async, but we don't need to await it here
  // because the actual results are handled by the callbacks.
  // The promise returned by apiClient.sse resolves/rejects based on initial connection setup.
  apiClient
    .sse("/translate/stream", requestOptions, callbacks)
    .then(() => {
      console.log(
        `[Background] apiClient.sse initiated successfully for tab ${targetTabId}.`
      );
      // The initial sendResponse in background.ts already acknowledged the request.
    })
    .catch((initialError) => {
      // This catch handles errors during the *initial* fetch setup by apiClient.sse
      // (e.g., invalid URL, immediate network error before stream starts).
      // Errors during the stream are handled by callbacks.onError.
      console.error(
        `[Background] Failed to initiate apiClient.sse for tab ${targetTabId}:`,
        initialError
      );
      // We might have already sent a failure response in background.ts if this rejects quickly.
      // If not, or for redundancy, send an error message.
      const errorMessage: ContentScriptStreamMessage<StreamErrorPayload> = {
        type: MSG_TYPE_STREAM_ERROR,
        payload: {
          error: initialError.message || "Failed to initiate SSE connection",
        },
      };
      // Check if tab still exists before sending
      chrome.tabs
        .get(targetTabId)
        .then(() => {
          chrome.tabs
            .sendMessage(targetTabId, errorMessage)
            .catch((err) =>
              console.warn(
                `Failed to send initiation error to tab ${targetTabId}: ${err.message}`
              )
            );
        })
        .catch(() => {
          console.warn(
            `[Background] Tab ${targetTabId} not found, cannot send SSE initiation error.`
          );
        });
    });
};
