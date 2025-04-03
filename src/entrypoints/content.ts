import {
  computePosition,
  autoPlacement,
  offset,
  shift,
} from "@floating-ui/dom";

export default defineContentScript({
  matches: [
    "*://*.com/*",
    "*://*.org/*",
    "*://*.net/*",
    "*://*.edu/*",
    "*://*.gov/*",
    "*://*.io/*",
  ],
  main() {
    console.log("[Lite Lingo] 内容脚本已加载", {
      timestamp: new Date().toISOString(),
    });

    // 创建 Shadow DOM 容器和气泡元素
    console.log("[Lite Lingo] 准备创建气泡元素");
    const createBubble = () => {
      // 创建容器
      const container = document.createElement("div");
      container.id = "lite-lingo-container";
      document.body.appendChild(container);
      console.log("[Lite Lingo] 容器元素已添加到 DOM", {
        containerId: container.id,
      });

      // 创建 Shadow DOM
      const shadow = container.attachShadow({ mode: "closed" });

      // 创建气泡元素
      const bubble = document.createElement("div");
      bubble.id = "lite-lingo-bubble";
      bubble.style.display = "none";

      // 添加样式
      const style = document.createElement("style");
      style.textContent = `
        #lite-lingo-bubble {
          position: absolute;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px;
          z-index: 9999;
          max-width: 300px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #333;
          font-size: 14px;
          line-height: 1.5;
          border: 1px solid #eaeaea;
        }
        
        .lite-lingo-button {
          background-color: #4285f4;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 8px;
          font-size: 12px;
        }
        
        .lite-lingo-button:hover {
          background-color: #3367d6;
        }
      `;

      shadow.appendChild(style);
      shadow.appendChild(bubble);
      console.log("[Lite Lingo] Shadow DOM 创建完成", { bubbleId: bubble.id });

      return { container, shadow, bubble };
    };

    const { container, shadow, bubble } = createBubble();
    console.log("[Lite Lingo] 气泡初始化完成");

    // 判断元素是否为可编辑元素或表单元素
    const isEditableElement = (element: Element | null): boolean => {
      if (!element) return false;

      // 检查是否为输入框、文本区域等
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) {
        return true;
      }

      // 检查是否有 contentEditable 属性
      if (
        element.hasAttribute("contenteditable") &&
        element.getAttribute("contenteditable") !== "false"
      ) {
        return true;
      }

      return false;
    };

    // 判断选中的文本是否在 Shadow DOM 中
    const isInShadowDOM = (element: Element | null): boolean => {
      if (!element) return false;

      let parent = element.parentElement;
      while (parent) {
        if (parent.shadowRoot) {
          return true;
        }
        parent = parent.parentElement;
      }

      return false;
    };

    // 获取选中文本的上下文
    const getTextContext = (selectedText: string, fullText: string): string => {
      if (!selectedText || !fullText) return "";

      const selectedTextIndex = fullText.indexOf(selectedText);
      if (selectedTextIndex === -1) return "";

      // 获取选中文本前后各100个字符作为上下文
      const contextStart = Math.max(0, selectedTextIndex - 100);
      const contextEnd = Math.min(
        fullText.length,
        selectedTextIndex + selectedText.length + 100
      );

      return fullText.substring(contextStart, contextEnd);
    };

    // 显示气泡
    const showBubble = async (
      text: string,
      context: string,
      x: number,
      y: number
    ) => {
      console.log("[Lite Lingo] showBubble 函数被调用", { text, x, y });
      const bubbleElement = shadow.getElementById(
        "lite-lingo-bubble"
      ) as HTMLElement;
      if (!bubbleElement) {
        console.error("[Lite Lingo] 错误: 无法获取气泡元素");
        return;
      }

      // 设置气泡内容
      console.log("[Lite Lingo] 设置气泡内容");
      bubbleElement.innerHTML = `
        <div>
          <strong>选中文本:</strong> ${text}
          <button class="lite-lingo-button">翻译</button>
        </div>
      `;

      // 显示气泡
      bubbleElement.style.display = "block";
      console.log("[Lite Lingo] 气泡显示状态已设置为显示");

      // 使用 Floating UI 定位气泡
      const virtualElement = {
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x,
            y,
            top: y,
            left: x,
            right: x,
            bottom: y,
          };
        },
      };

      const { x: posX, y: posY } = await computePosition(
        virtualElement,
        bubbleElement,
        {
          placement: "top",
          middleware: [
            offset(10),
            autoPlacement({ allowedPlacements: ["top", "bottom"] }),
            shift({ padding: 5 }),
          ],
        }
      );

      // 应用计算出的位置
      Object.assign(bubbleElement.style, {
        left: `${posX}px`,
        top: `${posY}px`,
      });
      console.log("[Lite Lingo] 气泡定位完成", { posX, posY });

      // 添加翻译按钮点击事件
      const translateButton = bubbleElement.querySelector(".lite-lingo-button");
      console.log("[Lite Lingo] 获取翻译按钮元素", {
        hasButton: !!translateButton,
      });

      if (translateButton) {
        translateButton.addEventListener("click", () => {
          console.log("[Lite Lingo] 翻译按钮被点击");
          console.log("[Lite Lingo] 准备翻译:", text);
          console.log("[Lite Lingo] 文本上下文:", context);
          // 这里可以添加发送消息到后台脚本进行翻译的逻辑
        });
      }
    };

    // 隐藏气泡
    const hideBubble = () => {
      console.log("[Lite Lingo] 调用 hideBubble 函数");
      const bubbleElement = shadow.getElementById(
        "lite-lingo-bubble"
      ) as HTMLElement;
      if (bubbleElement) {
        bubbleElement.style.display = "none";
        console.log("[Lite Lingo] 气泡已隐藏");
      } else {
        console.error("[Lite Lingo] 错误: 无法获取气泡元素以隐藏");
      }
    };

    // 监听选中文本事件
    console.log("[Lite Lingo] 注册 mouseup 事件监听器");
    document.addEventListener("mouseup", (event) => {
      console.log("[Lite Lingo] mouseup 事件触发", {
        x: event.clientX,
        y: event.clientY,
      });
      // 获取选中的文本
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      console.log("[Lite Lingo] 获取选中文本", {
        hasSelection: !!selection,
        selectionType: selection ? selection.type : "none",
        selectedText: selectedText || "(empty)",
        rangeCount: selection ? selection.rangeCount : 0,
      });

      // 如果没有选中文本，隐藏气泡
      if (!selectedText) {
        console.log("[Lite Lingo] 没有选中文本，隐藏气泡");
        hideBubble();
        return;
      }

      // 获取选中文本所在的元素
      const targetElement = selection?.anchorNode?.parentElement || null;
      console.log("[Lite Lingo] 选中文本的目标元素", {
        hasTargetElement: !!targetElement,
        tagName: targetElement?.tagName,
        className: targetElement?.className,
        id: targetElement?.id,
        nodeType: selection?.anchorNode?.nodeType,
        nodeValue: selection?.anchorNode?.nodeValue?.substring(0, 50),
      });

      // 判断是否为可编辑元素或在 Shadow DOM 中
      const isEditable = isEditableElement(targetElement);
      const isInShadow = isInShadowDOM(targetElement);
      console.log("[Lite Lingo] 元素检查结果", { isEditable, isInShadow });

      if (isEditable || isInShadow) {
        console.log("[Lite Lingo] 选中的文本在不可处理的区域，忽略");
        return;
      }

      // 获取选中文本的上下文
      let context = "";
      if (targetElement) {
        const fullText = targetElement.textContent || "";
        console.log("[Lite Lingo] 获取上下文", {
          fullTextLength: fullText.length,
          fullTextPreview:
            fullText.substring(0, 50) + (fullText.length > 50 ? "..." : ""),
        });
        context = getTextContext(selectedText, fullText);
      }

      // 打印选中的文本和上下文
      console.log("[Lite Lingo] 选中的文本:", selectedText);
      console.log("[Lite Lingo] 文本上下文:", context);

      // 显示气泡在鼠标位置
      console.log("[Lite Lingo] 准备显示气泡", {
        x: event.clientX,
        y: event.clientY,
      });
      showBubble(selectedText, context, event.clientX, event.clientY);
    });

    // 点击页面其他区域时隐藏气泡
    console.log("[Lite Lingo] 注册 mousedown 事件监听器");
    document.addEventListener("mousedown", (event) => {
      console.log("[Lite Lingo] mousedown 事件触发", {
        target: (event.target as Element)?.tagName,
      });
      // 检查点击是否在气泡外部
      const bubbleElement = shadow.getElementById(
        "lite-lingo-bubble"
      ) as HTMLElement;
      if (bubbleElement && bubbleElement.style.display !== "none") {
        console.log("[Lite Lingo] 气泡当前可见，检查点击位置");
        // 由于气泡在 Shadow DOM 中，点击事件不会传递到气泡内部
        // 所以我们只需要检查点击是否发生在容器外部
        if (event.target !== container) {
          console.log("[Lite Lingo] 点击在气泡外部，准备隐藏");
          hideBubble();
        } else {
          console.log("[Lite Lingo] 点击在气泡容器内，保持显示");
        }
      }
    });

    // 清理函数
    return () => {
      console.log("[Lite Lingo] 执行清理函数");
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
        console.log("[Lite Lingo] 容器元素已移除");
      }
    };
  },
});
