import React, { useRef } from "react";
import { createPortal } from "react-dom";
import * as ReactDOM from "react-dom/client";
import {
  computePosition,
  autoPlacement,
  offset,
  shift,
} from "@floating-ui/dom";
import { useAsync } from "react-use";
import { Button } from "./ui/button";

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
        strategy: 'fixed',
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

  // 处理翻译按钮点击
  const handleTranslateClick = (event: React.MouseEvent) => {
    // 阻止事件冒泡和默认行为
    event.stopPropagation();
    event.preventDefault();

    console.log("[Lite Lingo] 翻译按钮被点击");
    console.log("[Lite Lingo] 准备翻译:", text);
    console.log("[Lite Lingo] 文本上下文:", context);

    if (onTranslate) {
      onTranslate(text, context);
    }
  };

  // 处理朗读按钮点击
  const handleSpeechClick = async (event: React.MouseEvent) => {
    // 阻止事件冒泡和默认行为
    event.stopPropagation();
    event.preventDefault();

    console.log("[Lite Lingo] 朗读按钮被点击");
    console.log("[Lite Lingo] 准备朗读:", text);

    try {
      // 调用TTS API
      const response = await fetch("http://127.0.0.1:3000/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          // 检测文本语言，简单实现：包含中文字符则使用中文，否则使用英文
          language: /[\u4e00-\u9fa5]/.test(text) ? "zh" : "en",
          // 不指定voice，让后端根据language选择默认音色
        }),
      });

      if (!response.ok) {
        // 处理错误响应
        const errorText = await response.text();
        throw new Error(`TTS API 错误: ${response.status} - ${errorText}`);
      }

      // 获取音频blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // 创建音频元素并播放
      const audio = new Audio(audioUrl);
      audio.addEventListener("ended", () => {
        // 播放结束后释放资源
        URL.revokeObjectURL(audioUrl);
      });
      await audio.play();

      console.log("[Lite Lingo] 朗读成功");
    } catch (error) {
      console.error("[Lite Lingo] 朗读失败:", error);
    }

    // 如果存在onSpeech回调，调用它
    // if (onSpeech) {
    //   onSpeech(text);
    // }
  };

  // 如果不可见，不渲染任何内容
  if (!isVisible) {
    return null;
  }

  // 创建气泡内容
  const bubbleContent = (
    <div
      ref={bubbleRef}
      id="lite-lingo-bubble"
      className="fixed z-[9999] bg-white rounded-full shadow-lg border border-gray-200 p-1 flex items-center gap-1"
      style={{
        left: `${bubblePosition?.x || 0}px`,
        top: `${bubblePosition?.y || 0}px`,
      }}
      onClick={(event) => {
        // 阻止气泡点击事件冒泡
        event.stopPropagation();
      }}
    >
      <Button
        onClick={handleTranslateClick}
        variant="ghost"
        size="icon"
        className="h-4 w-4 rounded-full hover:bg-gray-100"
        title="翻译"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path
            d="M8.80005 2.80005H10.8C12.1255 2.80005 13.2 3.87457 13.2 5.20005V6.40005M7.20005 13.2H5.20005C3.87457 13.2 2.80005 12.1255 2.80005 10.8V8.80005"
            stroke="#1A2029"
            strokeWidth="1.2"
          ></path>
          <path
            d="M7.57195 8.7488C6.96715 8.5424 6.43195 8.324 5.96635 8.0936C5.50555 7.868 5.09515 7.616 4.73515 7.3376C4.38955 7.6064 3.98875 7.856 3.53275 8.0864C3.07675 8.3168 2.54875 8.5424 1.94875 8.7632L1.38715 7.7552C1.94875 7.5776 2.43835 7.3976 2.85595 7.2152C3.27355 7.0328 3.63835 6.836 3.95035 6.6248C3.65275 6.2888 3.39595 5.9144 3.17995 5.5016C2.96395 5.084 2.77915 4.6112 2.62555 4.0832H1.68235V3.1184H4.21675L4.05115 2.2904L5.14555 2.24C5.19355 2.4896 5.24395 2.7824 5.29675 3.1184H7.75195V4.0832H6.77995C6.63595 4.616 6.45835 5.0912 6.24715 5.5088C6.04075 5.9264 5.78875 6.3032 5.49115 6.6392C6.12955 7.0664 6.97675 7.4192 8.03275 7.6976L7.57195 8.7488ZM3.69115 4.0832C3.90235 4.8464 4.24315 5.4776 4.71355 5.9768C4.94395 5.7272 5.13835 5.4488 5.29675 5.1416C5.45515 4.8344 5.58715 4.4816 5.69275 4.0832H3.69115Z"
            fill="#1A2029"
          ></path>
          <path
            d="M12.424 11.824H10.168L9.68802 13.2H8.42402L10.496 7.64795H12.128L14.184 13.2H12.896L12.424 11.824ZM12.072 10.816L11.352 8.71195H11.256L10.52 10.816H12.072Z"
            fill="#1A2029"
          ></path>
        </svg>
      </Button>
      <Button
        onClick={handleSpeechClick}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-gray-100"
        title="朗读"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path
            d="M8 2.5V13.5"
            stroke="#1A2029"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M12.5 5.5V10.5"
            stroke="#1A2029"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M3.5 5.5V10.5"
            stroke="#1A2029"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      </Button>
      <Button
        onClick={(event) => {
          // 阻止事件冒泡和默认行为
          event.stopPropagation();
          event.preventDefault();

          // 处理关闭按钮点击
          console.log("[Lite Lingo] 关闭按钮被点击");
          if (onClose) {
            onClose();
          }
        }}
        variant="ghost"
        size="icon"
        className="h-4 w-4 rounded-full hover:bg-gray-100"
        title="关闭"
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1.5 1.5L6.5 6.5"
            stroke="#1A2029"
            strokeLinecap="round"
          ></path>
          <path
            d="M6.5 1.5L1.5 6.5"
            stroke="#1A2029"
            strokeLinecap="round"
          ></path>
        </svg>
      </Button>
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
  private bubbleRef: HTMLDivElement | null = null; // 追踪气泡实际 DOM 元素

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
    this.updateBubble(
      "",
      "",
      { clientRect: { top: 0, left: 0, width: 0, height: 0 } },
      false,
      undefined,
      undefined
    );

    this.isInitialized = true;
    console.log("[Lite Lingo] 气泡初始化完成");
  }

  /**
   * 显示气泡
   * @param text 选中的文本
   * @param context 文本上下文
   * @param position 鼠标位置
   * @param onTranslate 翻译回调
   * @param onSpeech 朗读回调
   */
  public show(
    text: string,
    context: string,
    position: {
      clientRect: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
    },
    onTranslate?: (text: string, context: string) => void,
    onSpeech?: (text: string) => void
  ): void {
    console.log("[Lite Lingo] 显示气泡", { text, position });
    this.updateBubble(text, context, position, true, onTranslate, onSpeech);
  }

  /**
   * 隐藏气泡
   */
  public hide(): void {
    console.log("[Lite Lingo] 隐藏气泡");
    if (this.root) {
      this.updateBubble(
        "",
        "",
        { clientRect: { top: 0, left: 0, width: 0, height: 0 } },
        false,
        undefined,
        undefined
      );
    }
  }

  /**
   * 更新气泡内容和状态
   */
  private updateBubble(
    text: string,
    context: string,
    position: {
      clientRect: {
        top: number;
        left: number;
        width: number;
        height: number;
      };
    },
    isVisible: boolean,
    onTranslate?: (text: string, context: string) => void,
    onSpeech?: (text: string) => void
  ): void {
    // 清除缓存的 DOM 引用，确保下次 getContainer 会重新查找
    this.bubbleRef = null;

    if (!this.root) return;

    this.root.render(
      <SelectionBubble
        text={text}
        context={context}
        position={position}
        onTranslate={onTranslate}
        onSpeech={onSpeech}
        onClose={this.hide.bind(this)}
        isVisible={isVisible}
      />
    );
  }

  /**
   * 获取气泡元素
   * 注意：这个方法现在返回的是实际的气泡元素，而不是容器
   */
  public getContainer(): HTMLElement | null {
    // 查找实际渲染的气泡元素（使用定义的唯一 ID）
    if (!this.bubbleRef) {
      this.bubbleRef = document.getElementById(
        "lite-lingo-bubble"
      ) as HTMLDivElement | null;
    }
    // 返回气泡元素或容器
    return this.bubbleRef || this.container;
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
