import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as ReactDOM from "react-dom/client";
import { computePosition, autoPlacement, offset, shift } from "@floating-ui/dom";

interface SelectionBubbleProps {
  text: string;
  context: string;
  position: { x: number; y: number };
  onTranslate?: (text: string, context: string) => void;
  onClose: () => void;
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
  onClose,
  isVisible,
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  // 处理翻译按钮点击
  const handleTranslateClick = () => {
    console.log("[Lite Lingo] 翻译按钮被点击");
    console.log("[Lite Lingo] 准备翻译:", text);
    console.log("[Lite Lingo] 文本上下文:", context);
    
    if (onTranslate) {
      onTranslate(text, context);
    }
  };

  // 计算气泡位置
  useEffect(() => {
    if (isVisible && bubbleRef.current) {
      const updatePosition = async () => {
        console.log("[Lite Lingo] 计算气泡位置", position);
        
        // 创建虚拟元素作为参考点
        const virtualElement = {
          getBoundingClientRect() {
            return {
              width: 0,
              height: 0,
              x: position.x,
              y: position.y,
              top: position.y,
              left: position.x,
              right: position.x,
              bottom: position.y,
            };
          },
        };

        // 使用 Floating UI 计算位置
        if (!bubbleRef.current) return;
        
        const { x, y } = await computePosition(virtualElement as Element, bubbleRef.current, {
          placement: "top",
          middleware: [
            offset(10),
            autoPlacement({ allowedPlacements: ["top", "bottom"] }),
            shift({ padding: 5 }),
          ],
        });

        console.log("[Lite Lingo] 气泡定位完成", { x, y });
        setBubblePosition({ x, y });
      };

      updatePosition();
    }
  }, [isVisible, position, text]);

  // 如果不可见，不渲染任何内容
  if (!isVisible) {
    return null;
  }

  // 创建气泡内容
  const bubbleContent = (
    <div
      ref={bubbleRef}
      className="lite-lingo-bubble"
      style={{
        position: "fixed",
        left: `${bubblePosition.x}px`,
        top: `${bubblePosition.y}px`,
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        padding: "12px",
        zIndex: 9999,
        maxWidth: "300px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#333",
        fontSize: "14px",
        lineHeight: 1.5,
        border: "1px solid #eaeaea",
      }}
    >
      <div>
        <strong>选中文本:</strong> {text}
        <button
          onClick={handleTranslateClick}
          style={{
            backgroundColor: "#4285f4",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "8px",
            fontSize: "12px",
            display: "block",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#3367d6";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#4285f4";
          }}
        >
          翻译
        </button>
      </div>
    </div>
  );

  // 使用 Portal 将气泡渲染到 body 中，避免被其他元素遮挡
  return createPortal(bubbleContent, document.body);
};

/**
 * 选择气泡管理器
 * 用于管理选择气泡的创建、显示和隐藏
 */
export class SelectionBubbleManager {
  private container: HTMLDivElement | null = null;
  private root: any = null; // 使用 any 类型避免 React.Root 类型错误
  private isInitialized: boolean = false;

  /**
   * 初始化气泡管理器
   */
  public init(): void {
    if (this.isInitialized) {
      console.log("[Lite Lingo] 气泡组件已经初始化，跳过");
      return;
    }

    console.log("[Lite Lingo] 准备创建气泡元素");
    
    // 创建容器元素
    this.container = document.createElement("div");
    this.container.id = "lite-lingo-container";
    document.body.appendChild(this.container);
    
    console.log("[Lite Lingo] 容器元素已添加到 DOM", {
      containerId: this.container.id,
    });
    
    // 创建 React 根节点
    this.root = ReactDOM.createRoot(this.container);
    
    // 初始渲染一个隐藏的气泡
    this.updateBubble("", "", { x: 0, y: 0 }, false);
    
    this.isInitialized = true;
    console.log("[Lite Lingo] 气泡初始化完成");
  }

  /**
   * 显示气泡
   * @param text 选中的文本
   * @param context 文本上下文
   * @param position 鼠标位置
   * @param onTranslate 翻译回调
   */
  public show(
    text: string,
    context: string,
    position: { x: number; y: number },
    onTranslate?: (text: string, context: string) => void
  ): void {
    console.log("[Lite Lingo] 显示气泡", { text, position });
    this.updateBubble(text, context, position, true, onTranslate);
  }

  /**
   * 隐藏气泡
   */
  public hide(): void {
    console.log("[Lite Lingo] 隐藏气泡");
    if (this.root) {
      this.updateBubble("", "", { x: 0, y: 0 }, false);
    }
  }

  /**
   * 更新气泡内容和状态
   */
  private updateBubble(
    text: string,
    context: string,
    position: { x: number; y: number },
    isVisible: boolean,
    onTranslate?: (text: string, context: string) => void
  ): void {
    if (!this.root) {
      console.error("[Lite Lingo] 错误: React 根节点未初始化");
      return;
    }

    // 渲染气泡组件
    this.root.render(
      <SelectionBubble
        text={text}
        context={context}
        position={position}
        isVisible={isVisible}
        onTranslate={onTranslate}
        onClose={() => this.hide()}
      />
    );
  }

  /**
   * 获取容器元素
   */
  public getContainer(): HTMLElement {
    return this.container as HTMLElement;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    console.log("[Lite Lingo] 执行气泡组件清理函数");
    
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      console.log("[Lite Lingo] 容器元素已移除");
    }
    
    this.isInitialized = false;
  }
}
