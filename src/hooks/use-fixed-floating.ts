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

// 面板初始高度（包含骨架屏内容）
const INITIAL_PANEL_HEIGHT = 268;

/**
 * 用于处理浮动元素初始定位和固定位置的钩子
 * 直接使用我们传递给位置引用的坐标，不依赖FloatingUI的计算
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
      // 计算视口坐标
      const viewportX = position.x - window.scrollX;
      const viewportY = position.y - window.scrollY;

      // 记录原始位置坐标
      console.log("[ Lite Lingo ] 原始选择位置:", position);
      console.log("[ Lite Lingo ] 滚动偏移:", {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });

      // 保存视口坐标作为引用位置
      setReferencePos({ x: viewportX, y: viewportY });

      console.log("[ Lite Lingo ] 设置位置引用(视口坐标):", {
        x: viewportX,
        y: viewportY,
      });

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
      });
    }
  }, [floating.x, floating.y]);

  // 构建最终样式 - 使用引用坐标作为基础并添加智能定位逻辑
  const finalStyles = referencePos
    ? (() => {
        // 获取视口高度
        const viewportHeight = window.innerHeight;

        // 计算面板底部位置（假设向下展示）
        const panelBottomIfDown = referencePos.y + 10 + INITIAL_PANEL_HEIGHT;

        // 判断面板是否会超出视口底部
        const wouldOverflowBottom = panelBottomIfDown > viewportHeight;

        // 记录定位决策
        console.log("[ Lite Lingo ] 面板定位决策:", {
          viewportHeight,
          panelBottomIfDown,
          wouldOverflowBottom,
          willShowAbove: wouldOverflowBottom,
        });

        // 如果会超出底部，则向上展示；否则向下展示
        const yOffset = wouldOverflowBottom
          ? -(INITIAL_PANEL_HEIGHT + 10) // 向上偏移（面板高度+间距）
          : 10; // 默认向下偏移10px

        return {
          position: "fixed" as const,
          left: 0,
          top: 0,
          transform: `translate(${referencePos.x}px, ${
            referencePos.y + yOffset
          }px) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          zIndex: 9999,
        };
      })()
    : {
        ...floating.floatingStyles,
        transform: `${floating.floatingStyles.transform || ""} translate(${
          dragOffset.x
        }px, ${dragOffset.y}px)`,
        zIndex: 9999,
      };

  // 记录拖拽偏移和最终位置
  useEffect(() => {
    if (referencePos && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      const isShowingAbove =
        referencePos.y + 10 + INITIAL_PANEL_HEIGHT > window.innerHeight;
      const baseYOffset = isShowingAbove ? -(INITIAL_PANEL_HEIGHT + 10) : 10;

      console.log("[ Lite Lingo ] 拖拽偏移:", dragOffset, "最终位置:", {
        x: referencePos.x + dragOffset.x,
        y: referencePos.y + baseYOffset + dragOffset.y,
        isShowingAbove,
      });
    }
  }, [referencePos, dragOffset]);

  return { referencePos, finalStyles };
}
