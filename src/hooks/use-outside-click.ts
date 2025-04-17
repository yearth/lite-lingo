import { RefObject, useEffect } from "react";
import { useClickAway } from "react-use";

interface UseOutsideClickProps {
  elementRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
  isDragging: boolean;
  isPinned: boolean;
  onClose: () => void;
  inShadowDOM?: boolean;
}

/**
 * 处理元素外部点击关闭逻辑的钩子
 */
export function useOutsideClick({
  elementRef,
  isVisible,
  isDragging,
  isPinned,
  onClose,
  inShadowDOM = false,
}: UseOutsideClickProps) {
  // 使用react-use的useClickAway处理常规点击情况
  useClickAway(elementRef, (e) => {
    if (isVisible && !isDragging && !isPinned) {
      onClose();
    }
  });

  // 特殊处理Shadow DOM环境中的点击
  useEffect(() => {
    if (!inShadowDOM || !isVisible) return;

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
  }, [elementRef, isVisible, isDragging, isPinned, onClose, inShadowDOM]);
}
