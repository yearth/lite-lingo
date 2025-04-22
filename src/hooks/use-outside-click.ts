import { RefObject, useEffect } from "react";

interface UseOutsideClickProps {
  elementRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
  isDragging: boolean;
  isPinned: boolean;
  onClose: () => void;
  inShadowDOM?: boolean; // 保留参数，但不再使用它
}

/**
 * 处理元素外部点击关闭逻辑的钩子
 * 专门为Shadow DOM环境优化
 */
export function useOutsideClick({
  elementRef,
  isVisible,
  isDragging,
  isPinned,
  onClose,
}: UseOutsideClickProps) {
  // 使用composedPath处理Shadow DOM环境中的点击
  useEffect(() => {
    if (!isVisible) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (isVisible && !isDragging && !isPinned) {
        // 获取事件路径，特别是在Shadow DOM中
        const path = e.composedPath();
        const target = path[0] as Node;

        // 检查点击目标是否在元素内部
        if (
          elementRef.current &&
          !elementRef.current.contains(target as Node)
        ) {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [elementRef, isVisible, isDragging, isPinned, onClose]);
}
