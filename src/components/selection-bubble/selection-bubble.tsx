import {
  autoPlacement,
  computePosition,
  offset,
  shift,
} from "@floating-ui/dom";
import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { useAsync } from "react-use";
import { BubbleActionButtons } from "./bubble-action-buttons"; // Adjusted import path

interface SelectionBubbleProps {
  text: string;
  context: string;
  position: {
    clientRect: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
  };
  onTranslate?: (text: string, context: string) => void;
  onSpeech?: (text: string) => void;
  onClose?: () => void;
  isVisible: boolean;
}

/**
 * 选择气泡 React 组件
 * 用于在用户选择文本时显示一个气泡，提供翻译等功能
 */
export const SelectionBubble: React.FC<SelectionBubbleProps> = ({
  text,
  context,
  position,
  onTranslate,
  onSpeech,
  onClose,
  isVisible,
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // 使用 react-use 的 useAsync 来处理异步定位计算
  const { value: bubblePosition, loading } = useAsync(async () => {
    if (!isVisible || !bubbleRef.current) return { x: 0, y: 0 };

    console.log("[Lite Lingo] 计算气泡位置", position);

    // 创建虚拟元素作为参考点
    const virtualElement = {
      getBoundingClientRect: () => {
        const rectData = position.clientRect;
        if (!rectData) {
          console.warn(
            "[Lite Lingo] clientRect data is missing in position prop"
          );
          return {
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            right: 0,
            bottom: 0,
          };
        }
        return {
          width: rectData.width,
          height: rectData.height,
          x: rectData.left,
          y: rectData.top,
          top: rectData.top,
          left: rectData.left,
          right: rectData.left + rectData.width,
          bottom: rectData.top + rectData.height,
        };
      },
    };

    // 使用 Floating UI 计算位置
    const { x, y } = await computePosition(
      virtualElement as Element,
      bubbleRef.current,
      {
        // 默认定位在元素上方
        placement: "top",
        strategy: "fixed",
        middleware: [
          offset(10),
          autoPlacement({
            allowedPlacements: ["top", "bottom"],
            padding: 10,
          }),
          shift({ padding: 10 }),
        ],
      }
    );

    console.log("[Lite Lingo] 气泡定位完成 (视口坐标)", { x, y });

    // 直接返回 computePosition 给出的视口坐标
    return { x, y };
  }, [isVisible, position.clientRect, bubbleRef.current]);

  const handleTranslate = () => {
    console.log("[Lite Lingo] 准备翻译:", text);
    console.log("[Lite Lingo] 文本上下文:", context);
    if (onTranslate) {
      onTranslate(text, context);
    }
  };

  const handleSpeech = () => {
    console.log("[Lite Lingo] 准备朗读:", text);
    if (onSpeech) {
      onSpeech(text);
    }
  };

  const handleClose = () => {
    // Removed console log from here as it's handled in manager/buttons
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) {
    return null;
  }

  const bubbleContent = (
    <div
      ref={bubbleRef}
      id="lite-lingo-bubble" // Keep this ID for the manager's getContainer
      className="fixed z-[9999] rounded-lg shadow-lg p-1 flex items-center gap-1 bg-white border border-gray-200 light" // Changed rounded-full to rounded-lg
      style={{
        left: `${bubblePosition?.x || 0}px`,
        top: `${bubblePosition?.y || 0}px`,
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <BubbleActionButtons
        onTranslate={handleTranslate}
        onSpeech={handleSpeech}
        onClose={handleClose}
      />
    </div>
  );

  // 使用 Portal 将气泡渲染到 body 中，避免被其他元素遮挡
  return createPortal(bubbleContent, document.body);
};
