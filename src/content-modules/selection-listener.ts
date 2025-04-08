import type { SelectionBubbleManager } from "@/components/selection-bubble";
import type { TranslationResultManager } from "@/components/translation-result"; // Import the type
import {
  getTextContext,
  isEditableElement,
  isInShadowDOM,
} from "@/utils/text-selection";
import type { handleSpeech, handleTranslate } from "./bubble-actions"; // Import types

/**
 * Sets up the mouseup event listener to detect text selections and show the bubble.
 * @param selectionBubble The SelectionBubbleManager instance.
 * @param translationResult The TranslationResultManager instance.
 * @param onTranslate The function to call when the translate button is clicked.
 * @param onSpeech The function to call when the speech button is clicked.
 * @returns A cleanup function to remove the event listener.
 */
export function setupSelectionListener(
  selectionBubble: SelectionBubbleManager,
  translationResult: TranslationResultManager, // Add translationResult parameter
  onTranslate: typeof handleTranslate, // Use imported type
  onSpeech: typeof handleSpeech // Use imported type
) {
  const handleMouseUp = (event: MouseEvent) => {
    console.log("[Lite Lingo] mouseup 事件触发", {
      x: event.clientX,
      y: event.clientY,
    });

    // 首先检查是否点击在气泡内部
    const bubbleElement = document.getElementById("lite-lingo-bubble");
    if (
      bubbleElement &&
      event.target instanceof Node &&
      bubbleElement.contains(event.target)
    ) {
      console.log("[Lite Lingo] 点击在气泡内部，不触发新气泡");
      return;
    }

    // 获取选中的文本
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    console.log("[Lite Lingo] 获取选中文本", {
      hasSelection: !!selection,
      selectionType: selection ? selection.type : "none",
      selectedText: selectedText || "(empty)",
      rangeCount: selection ? selection.rangeCount : 0,
    });

    // 如果没有选中文本，隐藏气泡
    if (!selectedText) {
      console.log("[Lite Lingo] 没有选中文本，隐藏气泡");
      selectionBubble.hide();
      return;
    }

    // 获取选中文本所在的元素
    const targetElement = selection?.anchorNode?.parentElement || null;
    console.log("[Lite Lingo] 选中文本的目标元素", {
      hasTargetElement: !!targetElement,
      tagName: targetElement?.tagName,
      className: targetElement?.className,
      id: targetElement?.id,
      nodeType: selection?.anchorNode?.nodeType,
      nodeValue: selection?.anchorNode?.nodeValue?.substring(0, 50),
    });

    // 判断是否为可编辑元素或在 Shadow DOM 中
    const isEditable = isEditableElement(targetElement);
    const isInShadow = isInShadowDOM(targetElement);
    console.log("[Lite Lingo] 元素检查结果", { isEditable, isInShadow });

    if (isEditable || isInShadow) {
      console.log("[Lite Lingo] 选中的文本在不可处理的区域，忽略");
      selectionBubble.hide(); // Also hide bubble if selection is invalid
      return;
    }

    // 获取选中文本的上下文
    let context = "";
    if (targetElement) {
      const fullText = targetElement.textContent || "";
      console.log("[Lite Lingo] 获取上下文", {
        fullTextLength: fullText.length,
        fullTextPreview:
          fullText.substring(0, 50) + (fullText.length > 50 ? "..." : ""),
      });
      context = getTextContext(selectedText, fullText);
    }

    // 打印选中的文本和上下文
    console.log("[Lite Lingo] 选中的文本:", selectedText);
    console.log("[Lite Lingo] 文本上下文:", context);

    // 显示气泡在选区位置
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selectionBubble.show(
        selectedText,
        context,
        {
          clientRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        },
        // Update the translate callback to pass selectionBubble and the original range
        (text, ctx) =>
          onTranslate(text, ctx, translationResult, selectionBubble, range),
        onSpeech
      );
    }
  };

  console.log("[Lite Lingo] Registering mouseup event listener...");
  document.addEventListener("mouseup", handleMouseUp);
  console.log("[Lite Lingo] mouseup event listener registered.");

  // Return cleanup function
  return () => {
    console.log("[Lite Lingo] Removing mouseup event listener...");
    document.removeEventListener("mouseup", handleMouseUp);
    console.log("[Lite Lingo] mouseup event listener removed.");
  };
}
