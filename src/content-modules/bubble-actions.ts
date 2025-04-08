import type { SelectionBubbleManager } from "@/components/selection-bubble"; // Import SelectionBubbleManager type
import type { TranslationResultManager } from "@/components/translation-result";
import {
  type BackgroundRequestMessage,
  type BackgroundResponseMessage,
  MSG_TYPE_MUTATION_REQUEST_TTS,
  MSG_TYPE_MUTATION_TRANSLATE_STREAM,
  type RequestTtsPayload,
  type TranslateStreamPayload,
} from "@/types/messaging";

/**
 * Handles the translate action triggered by the selection bubble.
 * Sends a translation request to the background script and updates the result UI.
 * Handles the translate action triggered by the selection bubble.
 * Hides the bubble, sends a translation request, and shows the result UI near the selection.
 * @param text The text to translate.
 * @param context The context of the selected text.
 * @param translationResult The TranslationResultManager instance.
 * @param selectionBubble The SelectionBubbleManager instance (to hide the bubble).
 * @param selectionRange The Range object of the original text selection (for positioning).
 */
export function handleTranslate(
  text: string,
  context: string,
  translationResult: TranslationResultManager,
  selectionBubble: SelectionBubbleManager, // Added parameter
  selectionRange: Range // Added parameter
) {
  console.log("[Lite Lingo] Handling translate action", { text, context });

  // 1. Hide the selection bubble immediately
  selectionBubble.hide();
  console.log("[Lite Lingo] Selection bubble hidden");

  // 2. Show the translation result panel, positioned relative to the selection range
  //    (The actual positioning logic is inside translationResult.show/TranslationResult component)
  translationResult.show(
    "" /* 初始无文本 */,
    text,
    selectionRange, // Pass the Range object for positioning
    true, // Start in loading state
    (speechText) => handleSpeech(speechText) // Pass handleSpeech wrapper
  );
  console.log("[Lite Lingo] Translation result shown (loading state)");

  // 构建消息
  const message: BackgroundRequestMessage<TranslateStreamPayload> = {
    type: MSG_TYPE_MUTATION_TRANSLATE_STREAM,
    payload: {
      text,
      context: context || "", // Ensure context is always a string
      targetLanguage: "zh-CN", // Or get from settings later
    },
  };

  // 发送消息到 Background Script
  chrome.runtime.sendMessage(message, (response: BackgroundResponseMessage) => {
    if (chrome.runtime.lastError) {
      console.error(
        "[Lite Lingo] 发送翻译请求失败:",
        chrome.runtime.lastError.message
      );
      translationResult.update(
        `启动翻译失败: ${chrome.runtime.lastError.message}`,
        false
      );
      return;
    }

    if (!response?.success) {
      console.error("[Lite Lingo] 启动翻译请求失败:", response?.error);
      translationResult.update(
        `启动翻译失败: ${response?.error || "未知错误"}`,
        false
      );
    } else {
      console.log("[Lite Lingo] 翻译流已成功启动");
      // 等待 onMessage 接收数据块
    }
  });
}

/**
 * Handles the speech action triggered by the selection bubble or result box.
 * Sends a TTS request to the background script.
 * @param text The text to speak.
 */
export function handleSpeech(text: string) {
  console.log("[Lite Lingo] 发送朗读请求消息", { text });

  const message: BackgroundRequestMessage<RequestTtsPayload> = {
    type: MSG_TYPE_MUTATION_REQUEST_TTS,
    payload: {
      text,
      language: "zh", // 假设当前只朗读中文翻译结果
    },
  };

  chrome.runtime.sendMessage(message, (response: BackgroundResponseMessage) => {
    if (chrome.runtime.lastError) {
      console.error(
        "[Lite Lingo] 发送朗读请求失败:",
        chrome.runtime.lastError.message
      );
      // 可选：显示错误给用户
      return;
    }
    if (!response?.success) {
      console.error("[Lite Lingo] 朗读请求失败:", response?.error);
      // 可选：显示错误给用户
    } else {
      console.log("[Lite Lingo] 朗读请求已发送");
    }
  });
}
