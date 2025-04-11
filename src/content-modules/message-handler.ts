import type { TranslationResultManager } from "@/components/translation-result";
import {
  AnalysisInfoPayload // Import this type
  ,


  type ContentScriptStreamMessage,
  isStreamDoneMessageV2,
  isStreamErrorMessage,
  isTextChunkMessage
} from "@/types/messaging";
import { StreamingJsonParser } from "@/utils/streaming-json-parser"; // Import the new parser

export function setupMessageHandler(
  translationResult: TranslationResultManager,
) {
  console.log("[Lite Lingo V2] setupMessageHandler (Custom Parser)");

  let parser: StreamingJsonParser | null = null;
  let streamEnded = false;
  let fullParsedObject: any = null; // To store the final object from onComplete

  function initializeParserAndCallbacks() {
    console.log("[Lite Lingo Parser] Initializing parser and callbacks...");
    streamEnded = false;
    fullParsedObject = null;

    // Define callbacks for the parser
    const callbacks = {
      // --- Streaming Callbacks (Char by Char) ---
      onTranslationResultChar: (char: string) => {
        translationResult.appendText(char); // Use appendText for the main result
      },
      onContextExplanationChar: (char: string) => {
        translationResult.appendContextExplanation(char);
      },
      onDictionaryDefinitionChar: (char: string) => {
        translationResult.appendDictionaryDefinition(char); // Call the new method
      },
      onDictionaryExampleChar: (char: string) => {
        translationResult.appendDictionaryExample(char); // Call the new method
      },
      onFragmentErrorChar: (char: string) => {
        // Fragment error might not need char-by-char streaming
        // Let's handle it in onComplete or handleCompleteValue for now
        console.log("Fragment Error Char (ignored for streaming):", char);
      },

      // --- Non-Streaming Callbacks (Complete Value) ---
      onAnalysisInfo: (data: AnalysisInfoPayload) => {
        // This might be called via onComplete now
        console.log("[Lite Lingo Parser] Received complete AnalysisInfo (via onComplete):", data);
        // translationResult.setAnalysisInfo(data); // Called via onComplete
      },
      onContextWordTranslation: (text: string) => {
        console.log("[Lite Lingo Parser] Received complete Context Word Translation:", text);
        // TODO: Need setContextWordTranslation method? Or update via setContext in onComplete?
        // For now, rely on onComplete to set the whole context object.
      },
      onDictionaryWord: (text: string) => {
        console.log("[Lite Lingo Parser] Received complete Dictionary Word:", text);
        // Rely on onComplete to set the whole dictionary object.
      },
      onDictionaryPhonetic: (text: string) => {
        console.log("[Lite Lingo Parser] Received complete Dictionary Phonetic:", text);
        // Rely on onComplete to set the whole dictionary object.
      },

      // --- General Callbacks ---
      onComplete: (result: any) => {
        console.log("[Lite Lingo Parser] Parsing complete. Final Object:", result);
        fullParsedObject = result; // Store the final object
        streamEnded = true; // Mark as ended normally
        translationResult.setLoading(false);

        // Update non-streamed fields from the final object
        if (result.analysisInfo) {
          translationResult.setAnalysisInfo(result.analysisInfo);
        }
        if (result.context) {
          // Update context explanation one last time if it wasn't streamed char-by-char
          // Or just set the whole context object if state supports it
           translationResult.setContext(result.context);
        }
        if (result.dictionary) {
          translationResult.setDictionary(result.dictionary);
        }
        if (result.fragmentError && !result.translationResult) {
            // If there was a fragment error, ensure it's displayed fully
            translationResult.setFragmentError(result.fragmentError);
        }
         // Ensure translationResult is finalized if needed (though appendText should cover it)
         if (result.translationResult) {
             // translationResult.setTranslationResult(result.translationResult); // Might cause flicker if appendText worked
         }
      },
      onError: (error: Error) => {
        console.error("[Lite Lingo Parser] Parser Error Callback:", error);
        if (!streamEnded) { // Avoid duplicate error reporting
          translationResult.showError(`解析错误: ${error.message}`);
          translationResult.setLoading(false);
          streamEnded = true;
        }
      }
    };

    parser = new StreamingJsonParser(callbacks);
  }

  // --- Message Listener ---
  const messageListener = (
    message: ContentScriptStreamMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    console.log("[Lite Lingo Parser] Received message:", message.type);

    if (streamEnded) {
      console.log("[Lite Lingo Parser] Ignoring message after stream end/error.");
      return false;
    }

    if (isTextChunkMessage(message)) {
      // Initialize parser on the first chunk
      if (!parser) {
        initializeParserAndCallbacks();
        translationResult.setLoading(true);
        // Reset UI fields that will be streamed
        translationResult.setTranslationResult("");
        translationResult.setContext(null); // Pass null to reset context object
        translationResult.setDictionaryDefinition(""); // Reset new field
        translationResult.setDictionaryExample(""); // Reset new field
      }

      // Process the chunk
      if (parser) {
        parser.processChunk(message.payload.text);
      }

    } else if (isStreamErrorMessage(message)) {
      console.error(
        "[Lite Lingo Parser] Received stream error from background:",
        message.payload.error
      );
      translationResult.showError(`翻译出错: ${message.payload.error}`);
      translationResult.setLoading(false);
      streamEnded = true;
      if (parser) parser.reset(); // Reset parser state on external error
    } else if (isStreamDoneMessageV2(message)) {
      console.log(
        "[Lite Lingo Parser] Received Done signal:",
        message.payload.status
      );
      if (parser && !streamEnded) {
        parser.finalize(); // Finalize parsing
      }
      // Ensure loading is off and stream is marked ended, even if finalize had issues
      translationResult.setLoading(false);
      streamEnded = true;

    } else {
      console.log(
        `[Lite Lingo Parser] Received unhandled message type "${message.type}", ignoring`
      );
    }

    return false;
  };

  console.log("[Lite Lingo Parser] Registering message listener...");
  chrome.runtime.onMessage.addListener(messageListener);
  console.log("[Lite Lingo Parser] Message listener registered.");

  // Return a cleanup function to remove the listener
  return () => {
    console.log("[Lite Lingo Parser] Removing message listener...");
    chrome.runtime.onMessage.removeListener(messageListener);
    console.log("[Lite Lingo Parser] Message listener removed.");
  };
}
