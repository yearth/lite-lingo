import * as ReactDOM from "react-dom/client";
import { SelectionBubble } from "./selection-bubble"; // Adjusted import path

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
    this.container.id = "lite-lingo-container"; // Keep original ID for potential CSS targeting
    // Ensure container is only added once if init is called multiple times somehow
    if (!document.getElementById(this.container.id)) {
      document.body.appendChild(this.container);
    }

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
    // Only update if it's currently visible to avoid unnecessary renders
    // Check isInitialized and root as well
    if (this.isInitialized && this.root) {
      // We need a way to check current visibility state if possible,
      // otherwise, we might re-render unnecessarily when hide is called multiple times.
      // For now, we proceed as before.
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

    if (!this.root) {
      console.error("[Lite Lingo] Manager not initialized or root is missing.");
      return;
    }

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
        "lite-lingo-bubble" // The ID of the bubble div itself
      ) as HTMLDivElement | null;
    }
    // 返回气泡元素或容器 (prefer bubble if found)
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
