import type { TranslationResultManager } from "@/components/translation-result";
import {
  AnalysisInfoPayload, // Import this type
  type ContentScriptStreamMessage,
  isStreamDoneMessageV2,
  isStreamErrorMessage,
  isTextChunkMessage,
} from "@/types/messaging";
import { StreamingJsonParser } from "@/utils/streaming-json-parser"; // Import the new parser

export function setupMessageHandler(
  translationResult: TranslationResultManager
) {
  console.log("[Lite Lingo V2] setupMessageHandler (Custom Parser)");

  let parser: StreamingJsonParser | null = null;
  let streamEnded = false;
  let fullParsedObject: any = null; // To store the final object from onComplete

  // 每次 message-handler 初始化时就重置流状态
  streamEnded = false;

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
      onDictionaryDefinitionChar: (index: number, char: string) => {
        translationResult.appendDictionaryDefinition(index, char); // Pass index
      },
      onDictionaryExampleChar: (index: number, char: string) => {
        translationResult.appendDictionaryExample(index, char); // Pass index
      },
      onFragmentErrorChar: (char: string) => {
        // Fragment error might not need char-by-char streaming
        // Let's handle it in onComplete or handleCompleteValue for now
        console.log("Fragment Error Char (ignored for streaming):", char);
      },

      // --- Non-Streaming Callbacks (Complete Value) ---
      onAnalysisInfo: (data: AnalysisInfoPayload) => {
        // This might be called via onComplete now
        console.log(
          "[Lite Lingo Parser] Received complete AnalysisInfo (via onComplete):",
          data
        );
        // translationResult.setAnalysisInfo(data); // Called via onComplete
      },
      onContextWordTranslation: (text: string) => {
        console.log(
          "[Lite Lingo Parser] Received complete Context Word Translation:",
          text
        );
        // TODO: Need setContextWordTranslation method? Or update via setContext in onComplete?
        // For now, rely on onComplete to set the whole context object.
      },
      onDictionaryWord: (text: string) => {
        console.log(
          "[Lite Lingo Parser] Received complete Dictionary Word:",
          text
        );
        // Rely on onComplete to set the whole dictionary object.
      },
      onDictionaryPhonetic: (text: string) => {
        console.log(
          "[Lite Lingo Parser] Received complete Dictionary Phonetic:",
          text
        );
        // Rely on onComplete to set the whole dictionary object.
      },
      onDictionaryDefinitionPos: (index: number, pos: string) => {
        console.log(
          `[Lite Lingo Parser] Received complete Dictionary Definition POS at index ${index}:`,
          pos
        );
        // TODO: Update state/UI with the POS for the specific definition index if needed.
        // This might require changes in TranslationState and DictionaryDisplay.
      },

      // --- General Callbacks ---
      onComplete: (result: any) => {
        console.log(
          "[Lite Lingo Parser] Parsing complete. Final Object:",
          result
        );
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
        if (!streamEnded) {
          // Avoid duplicate error reporting
          translationResult.showError(`解析错误: ${error.message}`);
          translationResult.setLoading(false);
          streamEnded = true;
        }
      },
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

    // 不能直接访问 translationResult.isVisible，所以采用新的策略
    // 我们在每次接收到新的 TEXT_CHUNK_RECEIVED 消息时强制重置 streamEnded
    // 这样即使用户关闭了面板，下一次翻译也能正常启动
    if (isTextChunkMessage(message)) {
      // 第一个文本块消息被视为新的翻译会话开始
      // 无论前一次会话的状态如何，都强制重置 streamEnded
      if (!parser) {
        // 只有在需要初始化 parser 时才重置，即新的翻译会话
        console.log(
          "[Lite Lingo Parser] New translation session, resetting stream state"
        );
        streamEnded = false;
      }
    }

    if (streamEnded) {
      console.log(
        "[Lite Lingo Parser] Ignoring message after stream end/error."
      );
      return false;
    }

    if (isTextChunkMessage(message)) {
      // Initialize parser on the first chunk
      if (!parser) {
        initializeParserAndCallbacks();
        translationResult.setLoading(true);
        // Reset UI fields that will be streamed
        translationResult.setTranslationResult("");
        translationResult.setContext(null);
        // Call the correct setters to reset/clear the arrays in the state
        // Assuming index 0 is sufficient for resetting, or perhaps better to reset in TranslationState.reset()
        // Let's keep the reset calls here for now, using index 0.
        translationResult.setDictionaryDefinitionText(0, ""); // Call correct reset method
        translationResult.setDictionaryExampleText(0, ""); // Call correct reset method
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
