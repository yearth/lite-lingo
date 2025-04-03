/**
 * 判断元素是否为可编辑元素或表单元素
 * @param element 要检查的元素
 */
export const isEditableElement = (element: Element | null): boolean => {
  if (!element) return false;

  // 检查是否为输入框、文本区域等
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  // 检查是否有 contentEditable 属性
  if (
    element.hasAttribute("contenteditable") &&
    element.getAttribute("contenteditable") !== "false"
  ) {
    return true;
  }

  return false;
};

/**
 * 判断选中的文本是否在 Shadow DOM 中
 * @param element 要检查的元素
 */
export const isInShadowDOM = (element: Element | null): boolean => {
  if (!element) return false;

  let parent = element.parentElement;
  while (parent) {
    if (parent.shadowRoot) {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
};

/**
 * 获取选中文本的上下文
 * @param selectedText 选中的文本
 * @param fullText 完整的文本内容
 */
export const getTextContext = (
  selectedText: string,
  fullText: string
): string => {
  if (!selectedText || !fullText) return "";

  const selectedTextIndex = fullText.indexOf(selectedText);
  if (selectedTextIndex === -1) return "";

  // 获取选中文本前后各100个字符作为上下文
  const contextStart = Math.max(0, selectedTextIndex - 100);
  const contextEnd = Math.min(
    fullText.length,
    selectedTextIndex + selectedText.length + 100
  );

  return fullText.substring(contextStart, contextEnd);
};
