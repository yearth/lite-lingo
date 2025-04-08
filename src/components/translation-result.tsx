import { computePosition, offset, shift } from "@floating-ui/dom";
import { Copy, Volume2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react"; // Added Fragment
import { createPortal } from "react-dom";
import { Button } from "./ui/button";

// Define types for dictionary data based on translate.md
interface DictionaryExample {
  original: string;
  translation: string;
}

interface DictionaryDefinition {
  pos: string; // Part of speech
  def: string; // Definition text
  examples: DictionaryExample[];
}

interface DictionaryData {
  word: string;
  translation: string;
  phonetic?: string;
  definitions: DictionaryDefinition[];
}

interface TranslationResultProps {
  text: string; // Main translation result
  originalText: string;
  position: { x: number; y: number };
  isVisible: boolean;
  isLoading: boolean;
  contextExplanation?: string | null; // New prop for context explanation
  dictionaryData?: DictionaryData | null; // New prop for dictionary data
  onClose: () => void;
  onSpeech?: (text: string) => void; // Speech for the main translation text
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
  contextExplanation, // Destructure new props
  dictionaryData, // Destructure new props
}) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [resultPosition, setResultPosition] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // --- State for dictionary speech ---
  // We might need separate speech handlers if we want to speak definitions/examples
  // For now, the main onSpeech prop likely targets the main translation text.

  // --- Calculate result box position ---
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
      strategy: "fixed",
      middleware: [offset(8), shift({ padding: 10 })],
    }).then(({ x, y }) => {
      setResultPosition({ x, y });
    });
  }, [isVisible, position.x, position.y]);

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
      <div className="text-sm mb-2 break-words text-gray-500">
        {originalText}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200 my-2"></div>

      {/* 翻译结果 */}
      <div className="text-xs text-gray-500 mb-1">译文:</div>
      <div className="text-sm mb-2 break-words text-gray-500">
        {isLoading && text.length === 0 ? (
          <div className="flex items-center space-x-1">
            <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
            <div
              className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            ></div>
          </div>
        ) : (
          text // Render main translation text
        )}
      </div>

      {/* Context Explanation (New Section) */}
      {contextExplanation && (
        <>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="text-xs text-gray-500 mb-1">上下文解释:</div>
          <div className="text-sm mb-2 break-words text-gray-500">
            {contextExplanation}
          </div>
        </>
      )}

      {/* Dictionary Data (New Section) */}
      {dictionaryData && (
        <>
          <div className="border-t border-gray-200 my-2"></div>
          {/* Dictionary Header */}
          <div className="mb-1">
            <span className="text-sm font-semibold">{dictionaryData.word}</span>
            {dictionaryData.phonetic && (
              <span className="text-xs text-gray-500 ml-1">
                [{dictionaryData.phonetic}]
              </span>
            )}
            <span className="text-sm text-gray-600 ml-2">
              ({dictionaryData.translation})
            </span>
            {/* Add a speech button specifically for the dictionary word? */}
          </div>
          {/* Definitions and Examples */}
          {dictionaryData.definitions.map((def, index) => (
            <div key={index} className="mb-1.5 ml-1">
              <div className="text-xs text-blue-600 font-medium">{def.pos}</div>
              <div className="text-sm text-gray-700 ml-2">{def.def}</div>
              {def.examples.map((ex, exIndex) => (
                <div
                  key={exIndex}
                  className="text-xs text-gray-500 ml-4 mt-0.5"
                >
                  <div>例: {ex.original}</div>
                  <div>{ex.translation}</div>
                  {/* Add speech button for example? */}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-1 mt-2">
        {/* Speech button likely targets the main translation 'text' */}
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

  // --- Enhanced State Management ---
  private currentProps: {
    text: string; // Main translation
    originalText: string;
    position: { x: number; y: number };
    isVisible: boolean;
    isLoading: boolean;
    contextExplanation: string | null; // Added state
    dictionaryData: DictionaryData | null; // Added state
    onSpeech?: (text: string) => void; // For main translation
  } = {
    // Initialize with default values
    text: "",
    originalText: "",
    position: { x: 0, y: 0 },
    isVisible: false,
    isLoading: false,
    contextExplanation: null,
    dictionaryData: null,
    onSpeech: undefined,
  };

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

    // Initial render (hidden)
    this.renderComponent();

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
    // Update state and render
    this.currentProps = {
      ...this.currentProps, // Keep existing state like onSpeech
      text: text,
      originalText: originalText,
      position: position,
      isVisible: true,
      isLoading: isLoading,
      contextExplanation: null, // Reset structured data on new show
      dictionaryData: null, // Reset structured data on new show
      onSpeech: onSpeech, // Update onSpeech callback if provided
    };
    this.renderComponent();
  }

  /**
   * Updates only the main translation text.
   */
  public update(text: string, isLoading: boolean = false): void {
    console.log("[Lite Lingo] Updating main translation text", {
      text,
      isLoading,
    });
    this.currentProps = {
      ...this.currentProps,
      text: text,
      isLoading: isLoading,
      isVisible: true, // Ensure it's visible when updating
    };
    this.renderComponent();
  }

  /**
   * Updates the context explanation text.
   */
  public updateContextExplanation(explanation: string): void {
    console.log("[Lite Lingo] Updating context explanation", { explanation });
    this.currentProps = {
      ...this.currentProps,
      contextExplanation: explanation,
      isLoading: true, // Keep loading as more data might come
      isVisible: true,
    };
    this.renderComponent();
  }

  /**
   * Starts rendering the dictionary section.
   */
  public startDictionary(data: DictionaryData): void {
    console.log("[Lite Lingo] Starting dictionary", data);
    this.currentProps = {
      ...this.currentProps,
      dictionaryData: { ...data, definitions: [] }, // Initialize with header data
      isLoading: true,
      isVisible: true,
    };
    this.renderComponent();
  }

  /**
   * Adds a definition to the current dictionary entry.
   */
  public addDefinition(
    definitionData: Omit<DictionaryDefinition, "examples">
  ): void {
    if (!this.currentProps.dictionaryData) {
      console.warn("[Lite Lingo] Cannot add definition: No active dictionary.");
      return;
    }
    console.log("[Lite Lingo] Adding definition", definitionData);
    this.currentProps.dictionaryData.definitions.push({
      ...definitionData,
      examples: [], // Initialize examples array
    });
    // No need to update isLoading here, keep it true
    this.renderComponent();
  }

  /**
   * Adds an example to the last definition in the current dictionary entry.
   */
  public addExample(exampleData: DictionaryExample): void {
    if (
      !this.currentProps.dictionaryData ||
      this.currentProps.dictionaryData.definitions.length === 0
    ) {
      console.warn("[Lite Lingo] Cannot add example: No active definition.");
      return;
    }
    console.log("[Lite Lingo] Adding example", exampleData);
    const lastDefinition =
      this.currentProps.dictionaryData.definitions[
        this.currentProps.dictionaryData.definitions.length - 1
      ];
    lastDefinition.examples.push(exampleData);
    // No need to update isLoading here, keep it true
    this.renderComponent();
  }

  /**
   * Optional: Called when the dictionary section is complete.
   */
  public endDictionary(): void {
    console.log("[Lite Lingo] Ending dictionary section");
    // We might not need to do anything specific here unless UI needs finalization
    // The dictionaryData state remains until hide() or new show()
    // Keep isLoading true until 'done' message arrives
    this.renderComponent(); // Re-render just in case
  }

  /**
   * Hides the translation result panel and resets state.
   */
  public hide(): void {
    console.log("[Lite Lingo] Hiding translation result");
    this.currentProps = {
      ...this.currentProps, // Keep onSpeech maybe? Or reset? Let's reset for now.
      text: "",
      originalText: "",
      // position: { x: 0, y: 0 }, // Keep last position? Doesn't matter if hidden
      isVisible: false,
      isLoading: false,
      contextExplanation: null,
      dictionaryData: null,
      onSpeech: undefined,
    };
    this.renderComponent();
  }

  /**
   * Sets the loading state. Typically called when the stream completes.
   */
  public setLoading(isLoading: boolean): void {
    console.log("[Lite Lingo] Setting loading state", { isLoading });
    if (this.currentProps.isLoading === isLoading) return; // Avoid unnecessary re-renders

    this.currentProps = {
      ...this.currentProps,
      isLoading: isLoading,
      // isVisible should already be true if we are setting loading to false after receiving data
    };
    this.renderComponent();
  }

  /**
   * Renders the TranslationResult component with current state.
   */
  private renderComponent(): void {
    if (!this.root) {
      console.error(
        "[Lite Lingo] Error: Translation result React root not initialized."
      );
      return;
    }
    if (!this.isInitialized) {
      console.warn(
        "[Lite Lingo] Warning: Attempted to render before initialization."
      );
      // return; // Allow initial render
    }

    console.log(
      "[Lite Lingo] Rendering TranslationResult with props:",
      this.currentProps
    );

    // Render the component with all current props
    this.root.render(
      <TranslationResult
        text={this.currentProps.text}
        originalText={this.currentProps.originalText}
        position={this.currentProps.position}
        isVisible={this.currentProps.isVisible}
        isLoading={this.currentProps.isLoading}
        contextExplanation={this.currentProps.contextExplanation}
        dictionaryData={this.currentProps.dictionaryData}
        onClose={() => this.hide()}
        onSpeech={this.currentProps.onSpeech}
      />
    );
  }

  /**
   * 获取结果元素
   */
  public getContainer(): HTMLElement | null {
    if (!this.resultRef) {
      this.resultRef = document.getElementById(
        "lite-lingo-translation-result"
      ) as HTMLDivElement | null;
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
