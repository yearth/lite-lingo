import { SelectionBubbleManager } from "@/components/selection-bubble";
import { TranslationResultManager } from "@/components/translation-result";

/**
 * Initializes the UI managers.
 * @returns An object containing the initialized managers and a cleanup function.
 */
export function initUiManagers() {
  console.log("[Lite Lingo] Initializing UI Managers...");

  // 创建气泡组件实例
  const selectionBubble = new SelectionBubbleManager();
  selectionBubble.init();

  // 创建翻译结果组件实例
  const translationResult = new TranslationResultManager();
  translationResult.init();

  console.log("[Lite Lingo] UI Managers initialized.");

  const cleanupUiManagers = () => {
    console.log("[Lite Lingo] Cleaning up UI Managers...");
    selectionBubble.cleanup();
    translationResult.cleanup();
    console.log("[Lite Lingo] UI Managers cleaned up.");
  };

  return {
    selectionBubble,
    translationResult,
    cleanupUiManagers,
  };
}
