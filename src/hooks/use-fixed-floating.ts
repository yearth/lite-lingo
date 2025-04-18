import { UseFloatingReturn } from "@floating-ui/react";
import { useEffect, useState } from "react";

// 定义Position类型
interface Position {
  x: number;
  y: number;
}

interface UseFixedFloatingProps {
  isVisible: boolean;
  position: Position | null;
  floating: UseFloatingReturn; // 整个useFloating返回值
  dragOffset: { x: number; y: number };
  resetDragOffset: () => void;
}

// 固定的额外Y轴偏移，确保显示在文本下方
const EXTRA_Y_OFFSET = 20;

/**
 * 用于处理浮动元素初始定位和固定位置的钩子
 * 充分利用FloatingUI的定位能力
 */
export function useFixedFloating({
  isVisible,
  position,
  floating,
  dragOffset,
  resetDragOffset,
}: UseFixedFloatingProps) {
  // 跟踪我们设置的位置引用坐标
  const [referencePos, setReferencePos] = useState<Position | null>(null);

  // 设置位置引用并存储原始坐标
  useEffect(() => {
    if (isVisible && position) {
      // 确保使用正确的滚动偏移量
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;

      // 计算视口坐标
      const viewportX = position.x - scrollX;
      const viewportY = position.y - scrollY;

      // 记录原始位置坐标
      console.log("[ Lite Lingo ] 原始选择位置:", position);
      console.log("[ Lite Lingo ] 滚动偏移:", {
        scrollX,
        scrollY,
        windowScrollX: window.scrollX,
        windowScrollY: window.scrollY,
        docScrollLeft: document.documentElement.scrollLeft,
        docScrollTop: document.documentElement.scrollTop,
      });

      // 保存视口坐标作为引用位置
      setReferencePos({ x: viewportX, y: viewportY });

      console.log("[ Lite Lingo ] 设置位置引用(视口坐标):", {
        x: viewportX,
        y: viewportY,
      });

      // 设置位置引用元素
      floating.refs.setPositionReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: viewportX,
            y: viewportY,
            top: viewportY,
            right: viewportX,
            bottom: viewportY,
            left: viewportX,
            toJSON() {
              return this;
            },
          };
        },
      });
    }
  }, [isVisible, position, floating.refs]);

  // 当面板隐藏时重置位置
  useEffect(() => {
    if (!isVisible) {
      if (referencePos) {
        console.log("[ Lite Lingo ] 重置引用位置 (面板隐藏)");
      }
      setReferencePos(null);
      resetDragOffset();
    }
  }, [isVisible, resetDragOffset, referencePos]);

  // 记录FloatingUI的计算值
  useEffect(() => {
    if (floating.x !== null && floating.y !== null) {
      console.log("[ Lite Lingo ] FloatingUI计算值:", {
        x: floating.x,
        y: floating.y,
        placement: floating.placement,
        strategy: floating.strategy,
        extraYOffset: EXTRA_Y_OFFSET,
      });
    }
  }, [floating.x, floating.y, floating.placement, floating.strategy]);

  // 使用FloatingUI的计算结果，添加拖拽偏移和固定额外偏移
  const finalStyles =
    floating.x !== null && floating.y !== null
      ? {
          position: "fixed" as const,
          top: 0,
          left: 0,
          transform: `translateX(${floating.x + dragOffset.x}px) translateY(${
            floating.y + EXTRA_Y_OFFSET + dragOffset.y
          }px)`,
          zIndex: 9999,
        }
      : {
          position: "fixed" as const,
          visibility: "hidden" as const,
          zIndex: 9999,
        };

  // 记录拖拽偏移和最终位置
  useEffect(() => {
    if (
      floating.x !== null &&
      floating.y !== null &&
      (dragOffset.x !== 0 || dragOffset.y !== 0)
    ) {
      console.log("[ Lite Lingo ] 拖拽偏移:", dragOffset, "最终位置:", {
        x: floating.x + dragOffset.x,
        y: floating.y + EXTRA_Y_OFFSET + dragOffset.y,
      });
    }
  }, [floating.x, floating.y, dragOffset]);

  return { referencePos, finalStyles };
}
