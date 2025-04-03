import { SelectionBubbleManager } from "../components/selection-bubble.tsx";
import { isEditableElement, isInShadowDOM, getTextContext } from "../utils/text-selection";

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

    // 创建气泡组件实例
    const selectionBubble = new SelectionBubbleManager();
    selectionBubble.init();

    // 处理翻译按钮点击
    const handleTranslate = (text: string, context: string) => {
      console.log("[Lite Lingo] 处理翻译请求", { text, context });
      // 这里可以添加发送消息到后台脚本进行翻译的逻辑
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
        selectionBubble.hide();
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
      
      selectionBubble.show(
        selectedText, 
        context, 
        { x: event.clientX, y: event.clientY },
        handleTranslate
      );
    });

    // 点击页面其他区域时隐藏气泡
    console.log("[Lite Lingo] 注册 mousedown 事件监听器");
    document.addEventListener("mousedown", (event) => {
      console.log("[Lite Lingo] mousedown 事件触发", {
        target: (event.target as Element)?.tagName,
      });
      
      // 获取气泡容器元素
      const container = selectionBubble.getContainer();
      
      // 检查点击是否在气泡外部
      if (event.target !== container) {
        console.log("[Lite Lingo] 点击在气泡外部，准备隐藏");
        selectionBubble.hide();
      } else {
        console.log("[Lite Lingo] 点击在气泡容器内，保持显示");
      }
    });

    // 清理函数
    return () => {
      console.log("[Lite Lingo] 执行清理函数");
      selectionBubble.cleanup();
    };
  },
});
