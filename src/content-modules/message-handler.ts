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

  // 重置所有翻译相关状态，将其视为全新的翻译事件
  function resetTranslationState() {
    console.log(
      "[Lite Lingo Parser] Resetting all translation state for new event"
    );
    streamEnded = false;
    fullParsedObject = null;
    parser = null; // 确保parser也被重置，强制在下一次翻译时重新初始化
  }

  function initializeParserAndCallbacks() {
    console.log("[Lite Lingo Parser] Initializing parser and callbacks...");
    // 不在这里重置状态，因为resetTranslationState已经被调用了

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

    // 检测新的翻译事件
    if (isTextChunkMessage(message)) {
      // 如果这是第一个文本块，说明是新的翻译事件开始
      // 无论上一次翻译是否正常结束，都将其视为新事件
      if (!parser) {
        // 重置所有翻译相关状态
        resetTranslationState();

        // 重新初始化解析器
        initializeParserAndCallbacks();
        translationResult.setLoading(true);

        // 重置 UI 字段
        translationResult.setTranslationResult("");
        translationResult.setContext(null);
        translationResult.setDictionaryDefinitionText(0, "");
        translationResult.setDictionaryExampleText(0, "");
      }

      // 处理文本块
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
  // 初始状态时也重置一次翻译状态
  resetTranslationState();
  chrome.runtime.onMessage.addListener(messageListener);
  console.log("[Lite Lingo Parser] Message listener registered.");

  // 返回包含 cleanup 和 reset 方法的对象
  return {
    // 清理函数 - 移除消息监听器
    cleanup: () => {
      console.log("[Lite Lingo Parser] Removing message listener...");
      chrome.runtime.onMessage.removeListener(messageListener);
      console.log("[Lite Lingo Parser] Message listener removed.");
    },
    // 重置函数 - 重置所有翻译相关状态
    reset: () => {
      console.log("[Lite Lingo Parser] External reset triggered");
      resetTranslationState();
    },
  };
}
