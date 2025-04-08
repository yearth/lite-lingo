import {
  BackgroundResponseMessage,
  ContentScriptStreamMessage,
  MSG_TYPE_STREAM_COMPLETE,
  MSG_TYPE_STREAM_ERROR,
  MSG_TYPE_STREAM_EVENT,
  StreamCompletePayload,
  StreamErrorPayload,
  StreamEventPayload,
  TranslateStreamPayload,
} from "../types/messaging";
import apiClient, { SseCallbacks } from "../utils/api-client";

// Define a simple success data type for the initial response, if needed
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
    onMessage: (apiResponse) => {
      // Check for API-level errors first (non-"0" code)
      if (apiResponse.code !== "0" && apiResponse.code !== 0) {
        console.error(
          `[Action: TranslateStream] SSE stream error for tab ${tabId}: [${apiResponse.code}] ${apiResponse.message}`
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
              `[Action: TranslateStream] Failed to send stream error to tab ${tabId}: ${err.message}`
            )
          );
        return; // Stop processing this message
      }

      // Process successful data
      if (apiResponse.data) {
        const streamEvent = apiResponse.data; // Type is StreamEventPayload | null

        // Handle 'done' event
        if (streamEvent.type === "done") {
          console.log(
            `[Action: TranslateStream] SSE stream finished for tab ${tabId}:`,
            streamEvent.payload?.status
          );
          const completeMessage: ContentScriptStreamMessage<StreamCompletePayload> =
            {
              type: MSG_TYPE_STREAM_COMPLETE,
              payload: { status: streamEvent.payload?.status ?? "failed" },
            };
          chrome.tabs
            .sendMessage(tabId, completeMessage)
            .catch((err) =>
              console.warn(
                `[Action: TranslateStream] Failed to send completion to tab ${tabId}: ${err.message}`
              )
            );
        }
        // Handle error events within the stream data
        else if (
          ["error", "fragment_error", "parsing_error"].includes(
            streamEvent.type
          )
        ) {
          console.error(
            `[Action: TranslateStream] SSE stream reported error (${streamEvent.type}) for tab ${tabId}:`,
            streamEvent.payload?.message
          );
          const streamErrorMessage: ContentScriptStreamMessage<StreamErrorPayload> =
            {
              type: MSG_TYPE_STREAM_ERROR,
              payload: {
                error:
                  streamEvent.payload?.message ||
                  `Unknown stream error (${streamEvent.type})`,
              },
            };
          chrome.tabs
            .sendMessage(tabId, streamErrorMessage)
            .catch((err) =>
              console.warn(
                `[Action: TranslateStream] Failed to send stream error event to tab ${tabId}: ${err.message}`
              )
            );
        }
        // Handle regular stream events
        else {
          const eventMessage: ContentScriptStreamMessage<StreamEventPayload> = {
            type: MSG_TYPE_STREAM_EVENT,
            payload: streamEvent,
          };

          console.log(
            `[Action: TranslateStream] Sending stream event (${streamEvent.type}) to tab ${tabId}:`,
            streamEvent
          );

          chrome.tabs
            .sendMessage(tabId, eventMessage)
            .catch((err) =>
              console.warn(
                `[Action: TranslateStream] Failed to send stream event (${streamEvent.type}) to tab ${tabId}: ${err.message}`
              )
            );
        }
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
    await apiClient.sse("/translate/stream", requestOptions, callbacks);
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
