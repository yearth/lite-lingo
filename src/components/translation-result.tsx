import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  computePosition,
  autoPlacement,
  offset,
  shift,
} from "@floating-ui/dom";
import { Button } from "./ui/button";
import { X, Volume2, Copy } from "lucide-react";

interface TranslationResultProps {
  text: string;
  originalText: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSpeech?: (text: string) => void;
}

/**
 * 翻译结果组件
 * 用于显示翻译结果，支持流式更新
 */
export const TranslationResult: React.FC<TranslationResultProps> = ({
  text,
  originalText,
  position,
  isVisible,
  isLoading,
  onClose,
  onSpeech,
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [resultPosition, setResultPosition] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // 计算结果框位置
  useEffect(() => {
    if (!isVisible || !resultRef.current) return;

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

    computePosition(virtualElement as Element, resultRef.current, {
      placement: "bottom",
      middleware: [
        offset(10),
        autoPlacement({ allowedPlacements: ["top", "bottom"] }),
        shift({ padding: 5 }),
      ],
    }).then(({ x, y }) => {
      setResultPosition({ x, y });
    });
  }, [isVisible, position.x, position.y, text, resultRef.current]);

  // 处理复制按钮点击
  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 处理朗读按钮点击
  const handleSpeech = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (onSpeech) {
      onSpeech(text);
    }
  };

  // 如果不可见，不渲染任何内容
  if (!isVisible) {
    return null;
  }

  // 创建结果内容
  const resultContent = (
    <div
      ref={resultRef}
      id="lite-lingo-translation-result"
      className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs"
      style={{
        left: `${resultPosition.x}px`,
        top: `${resultPosition.y}px`,
        minWidth: "200px",
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500 font-medium">翻译结果</div>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onClose();
          }}
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full hover:bg-gray-100"
          title="关闭"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* 原文 */}
      <div className="text-xs text-gray-500 mb-1">原文:</div>
      <div className="text-sm mb-2 break-words">{originalText}</div>
      
      {/* 分隔线 */}
      <div className="border-t border-gray-200 my-2"></div>
      
      {/* 翻译结果 */}
      <div className="text-xs text-gray-500 mb-1">译文:</div>
      <div className="text-sm mb-2 break-words">
        {isLoading && text.length === 0 ? (
          <div className="flex items-center space-x-1">
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        ) : (
          text
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex justify-end space-x-1 mt-2">
        <Button
          onClick={handleSpeech}
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-100"
          title="朗读译文"
          disabled={isLoading || text.length === 0}
        >
          <Volume2 className="h-3 w-3" />
        </Button>
        <Button
          onClick={handleCopy}
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full hover:bg-gray-100"
          title={copied ? "已复制" : "复制译文"}
          disabled={isLoading || text.length === 0}
        >
          <Copy className="h-3 w-3" />
          {copied && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 h-2 w-2 bg-green-500 rounded-full"></span>
          )}
        </Button>
      </div>
    </div>
  );

  // 使用 Portal 将结果框渲染到 body 中
  return createPortal(resultContent, document.body);
};

/**
 * 翻译结果管理器
 * 用于管理翻译结果的创建、显示和隐藏
 */
export class TranslationResultManager {
  private container: HTMLDivElement | null = null;
  private root: any = null;
  private isInitialized: boolean = false;
  private resultRef: HTMLDivElement | null = null;

  /**
   * 初始化结果管理器
   */
  public init(): void {
    if (this.isInitialized) {
      return;
    }

    // 创建容器元素
    this.container = document.createElement("div");
    this.container.id = "lite-lingo-translation-container";
    document.body.appendChild(this.container);

    // 创建 React 根节点
    this.root = ReactDOM.createRoot(this.container);

    // 初始渲染一个隐藏的结果框
    this.updateResult("", "", { x: 0, y: 0 }, false, false);

    this.isInitialized = true;
  }

  /**
   * 显示翻译结果
   */
  public show(
    text: string,
    originalText: string,
    position: { x: number; y: number },
    isLoading: boolean = false,
    onSpeech?: (text: string) => void
  ): void {
    this.updateResult(text, originalText, position, true, isLoading, onSpeech);
  }

  /**
   * 更新翻译结果
   */
  public update(text: string, isLoading: boolean = false): void {
    if (!this.root) return;
    
    const currentProps = this.root._internalRoot?.current?.memoizedProps?.children?.props;
    if (!currentProps) return;
    
    const { originalText, position, isVisible, onSpeech } = currentProps;
    this.updateResult(text, originalText, position, isVisible, isLoading, onSpeech);
  }

  /**
   * 隐藏翻译结果
   */
  public hide(): void {
    if (this.root) {
      this.updateResult("", "", { x: 0, y: 0 }, false, false);
    }
  }

  /**
   * 更新结果内容和状态
   */
  private updateResult(
    text: string,
    originalText: string,
    position: { x: number; y: number },
    isVisible: boolean,
    isLoading: boolean,
    onSpeech?: (text: string) => void
  ): void {
    this.resultRef = null;
    if (!this.root) {
      console.error("[Lite Lingo] 错误: 翻译结果 React 根节点未初始化");
      return;
    }

    // 渲染结果组件
    this.root.render(
      <TranslationResult
        text={text}
        originalText={originalText}
        position={position}
        isVisible={isVisible}
        isLoading={isLoading}
        onClose={() => this.hide()}
        onSpeech={onSpeech}
      />
    );
  }

  /**
   * 获取结果元素
   */
  public getContainer(): HTMLElement | null {
    if (!this.resultRef) {
      this.resultRef = document.getElementById("lite-lingo-translation-result") as HTMLDivElement | null;
    }
    return this.resultRef || this.container;
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }

    this.isInitialized = false;
  }
}

import * as ReactDOM from "react-dom/client";
