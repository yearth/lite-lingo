import {
  BackgroundResponseMessage,
  RequestTtsPayload,
} from "../types/messaging";

// Define a simple success data structure if the original didn't have one
interface TtsInitiatedData {
  message: string;
}

export function handleRequestTts(
  payload: RequestTtsPayload,
  sendResponse: (response: BackgroundResponseMessage<TtsInitiatedData>) => void
): void {
  // Note: This function itself isn't async, but chrome.tts.speak is.
  // The listener in background.ts needs to return true.
  console.log(
    "[Action: RequestTTS] Handling request via chrome.tts:",
    payload.text
  );

  try {
    chrome.tts.speak(
      payload.text,
      {
        lang: payload.language === "zh" ? "zh-CN" : "en-US", // Map language code
        onEvent: (event) => {
          if (event.type === "error") {
            console.error(
              "[Action: RequestTTS] chrome.tts error:",
              event.errorMessage
            );
            // Error handling after initial response is tricky.
            // Usually logged or might trigger another message if needed.
          } else if (event.type === "end") {
            console.log("[Action: RequestTTS] chrome.tts finished speaking.");
          }
        },
      },
      () => {
        // This callback runs AFTER the speak function is called.
        if (chrome.runtime.lastError) {
          console.error(
            "[Action: RequestTTS] Failed to initiate chrome.tts:",
            chrome.runtime.lastError.message
          );
          // It's too late to call sendResponse here if it was already called successfully.
          // If the initial call failed immediately, sendResponse might not have been called yet.
          // However, the original logic sends success *before* this callback might reveal an error.
          // We'll stick to the original logic: send success if the *initiation* doesn't throw immediately.
          // If an error occurs *later*, it's logged via onEvent.
          // If the *initial* call fails, the catch block below should handle it,
          // but chrome.tts often uses chrome.runtime.lastError in the callback.
          // Let's refine to send error *only* if lastError is set *here*.
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log(
            "[Action: RequestTTS] chrome.tts request initiated successfully."
          );
          // Send success response immediately for *initiating* the request
          sendResponse({
            success: true,
            data: { message: "TTS initiated" },
          });
        }
      }
    );
  } catch (error: any) {
    // Catch synchronous errors during the initial call setup, if any.
    console.error("[Action: RequestTTS] Error setting up chrome.tts:", error);
    sendResponse({
      success: false,
      error: error.message || "Failed to initiate TTS",
    });
  }
  // No return value needed here, but the caller (background.ts listener) must return true.
}
