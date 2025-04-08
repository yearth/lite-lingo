import type { SelectionBubbleManager } from "@/components/selection-bubble";
import type { TranslationResultManager } from "@/components/translation-result";

/**
 * Sets up the mousedown event listener to hide the bubble and result box
 * when clicking outside of them.
 * @param selectionBubble The SelectionBubbleManager instance.
 * @param translationResult The TranslationResultManager instance.
 * @returns A cleanup function to remove the event listener.
 */
export function setupClickListener(
  selectionBubble: SelectionBubbleManager,
  translationResult: TranslationResultManager
) {
  const handleMouseDown = (event: MouseEvent) => {
    console.log("[Lite Lingo] mousedown 事件触发", {
      target: (event.target as Element)?.tagName,
    });

    // 获取气泡和结果容器元素
    const bubbleContainer = selectionBubble.getContainer();
    const resultContainer = translationResult.getContainer();

    // 检查点击是否在气泡或翻译结果内部
    const isClickInBubble =
      bubbleContainer &&
      event.target instanceof Node &&
      bubbleContainer.contains(event.target);
    const isClickInResult =
      resultContainer &&
      event.target instanceof Node &&
      resultContainer.contains(event.target);

    if (isClickInBubble) {
      console.log("[Lite Lingo] 点击在气泡内部，保持显示");
    } else if (isClickInResult) {
      console.log("[Lite Lingo] 点击在翻译结果内部，保持显示");
      // Do nothing, keep both visible
    } else {
      console.log("[Lite Lingo] 点击在气泡和翻译结果外部，隐藏气泡");
      selectionBubble.hide();
      // Note: TranslationResult is typically hidden automatically when the bubble hides
      // or when a new translation starts. Explicitly hiding here might be redundant
      // depending on the exact behavior of TranslationResultManager.
      // translationResult.hide(); // Consider if this is needed

      // TODO: Consider sending a "cancel" message to background if needed for ongoing streams
    }
  };

  console.log("[Lite Lingo] Registering mousedown event listener...");
  document.addEventListener("mousedown", handleMouseDown);
  console.log("[Lite Lingo] mousedown event listener registered.");

  // Return cleanup function
  return () => {
    console.log("[Lite Lingo] Removing mousedown event listener...");
    document.removeEventListener("mousedown", handleMouseDown);
    console.log("[Lite Lingo] mousedown event listener removed.");
  };
}
