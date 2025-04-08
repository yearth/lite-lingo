import type { TranslationResultManager } from "@/components/translation-result";
import {
  type ContentScriptStreamMessage,
  isStreamCompleteMessage,
  isStreamErrorMessage,
  isStreamEventMessage,
} from "@/types/messaging";

/**
 * Sets up the message listener to handle stream events from the background script.
 * @param translationResult The TranslationResultManager instance to update the UI.
 */
export function setupMessageHandler(
  translationResult: TranslationResultManager
) {
  // State for dictionary context, managed within the handler's scope
  let currentDictionaryEntry: any = null;

  const messageListener = (
    message: ContentScriptStreamMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    // Optional: Add sender check if needed (e.g., ensure it's from the extension)
    // if (sender.id !== chrome.runtime.id) {
    //   console.warn("[Lite Lingo] Received message from unexpected sender:", sender.id);
    //   return;
    // }

    console.log("[Lite Lingo] Received message:", message);

    if (isStreamEventMessage(message)) {
      const streamEvent = message.payload;
      const eventPayload = streamEvent.payload;

      console.log(
        `[Lite Lingo] Processing Stream Event: ${streamEvent.type}`,
        eventPayload
      );

      switch (streamEvent.type) {
        case "analysis_info":
          console.log(
            "[Lite Lingo] Analysis Info:",
            eventPayload?.inputType,
            eventPayload?.sourceText
          );
          // Example: translationResult.showAnalysisInfo(eventPayload);
          break;
        case "context_explanation":
          console.log("[Lite Lingo] Context Explanation:", eventPayload?.text);
          translationResult.updateContextExplanation(eventPayload?.text ?? "");
          break;
        case "dictionary_start":
          console.log("[Lite Lingo] Dictionary Start:", eventPayload);
          currentDictionaryEntry = {
            ...(eventPayload ?? {}),
            definitions: [],
          };
          translationResult.startDictionary(currentDictionaryEntry);
          break;
        case "definition":
          if (currentDictionaryEntry) {
            console.log("[Lite Lingo] Definition:", eventPayload);
            const newDefinition = {
              ...(eventPayload ?? {}),
              examples: [],
            };
            currentDictionaryEntry.definitions.push(newDefinition);
            translationResult.addDefinition(newDefinition);
          } else {
            console.warn(
              "[Lite Lingo] Received 'definition' event without active dictionary entry."
            );
          }
          break;
        case "example":
          if (
            currentDictionaryEntry &&
            currentDictionaryEntry.definitions.length > 0
          ) {
            console.log("[Lite Lingo] Example:", eventPayload);
            const lastDefinition =
              currentDictionaryEntry.definitions[
                currentDictionaryEntry.definitions.length - 1
              ];
            lastDefinition.examples = lastDefinition.examples || [];
            lastDefinition.examples.push(eventPayload ?? {});
            translationResult.addExample(eventPayload ?? {});
          } else {
            console.warn(
              "[Lite Lingo] Received 'example' event without active definition."
            );
          }
          break;
        case "dictionary_end":
          console.log("[Lite Lingo] Dictionary End");
          translationResult.endDictionary?.();
          currentDictionaryEntry = null;
          break;
        case "translation_result":
          console.log("[Lite Lingo] Translation Result:", eventPayload?.text);
          translationResult.update(eventPayload?.text ?? "", true);
          break;
        default:
          console.warn(
            "[Lite Lingo] Received unhandled stream event type:",
            streamEvent.type
          );
      }
    } else if (isStreamErrorMessage(message)) {
      console.error(
        "[Lite Lingo] Received stream error:",
        message.payload.error
      );
      translationResult.update(`翻译出错: ${message.payload.error}`, false);
      currentDictionaryEntry = null;
    } else if (isStreamCompleteMessage(message)) {
      console.log(
        "[Lite Lingo] Received stream complete signal:",
        message.payload.status
      );
      translationResult.setLoading(false);
      currentDictionaryEntry = null;
      if (message.payload.status === "failed") {
        // Optionally display a generic failure message
        // translationResult.showError("翻译失败");
      }
    } else {
      console.log(
        "[Lite Lingo] Received unknown or non-stream message, ignoring"
      );
    }

    // Return false as we are not using sendResponse asynchronously here.
    return false;
  };

  console.log("[Lite Lingo] Registering message listener...");
  chrome.runtime.onMessage.addListener(messageListener);
  console.log("[Lite Lingo] Message listener registered.");

  // Return a cleanup function to remove the listener
  return () => {
    console.log("[Lite Lingo] Removing message listener...");
    chrome.runtime.onMessage.removeListener(messageListener);
    console.log("[Lite Lingo] Message listener removed.");
  };
}
