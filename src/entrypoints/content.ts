import { SelectionBubbleManager } from "../components/selection-bubble.tsx";
import { TranslationResultManager } from "../components/translation-result.tsx";
import { isEditableElement, isInShadowDOM, getTextContext } from "../utils/text-selection";
import { streamTranslate } from "../utils/translation-service";

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
    
    // 创建翻译结果组件实例
    const translationResult = new TranslationResultManager();
    translationResult.init();
    
    // 用于存储取消翻译的函数
    let cancelTranslation: (() => void) | null = null;

    // 处理翻译按钮点击
    const handleTranslate = (text: string, context: string) => {
      console.log("[Lite Lingo] 处理翻译请求", { text, context });
      
      // 获取气泡位置，用于定位翻译结果框
      const bubbleElement = document.getElementById("lite-lingo-bubble");
      if (!bubbleElement) return;
      
      const bubbleRect = bubbleElement.getBoundingClientRect();
      const resultPosition = {
        x: bubbleRect.left + bubbleRect.width / 2,
        y: bubbleRect.bottom,
      };
      
      // 显示翻译结果框（初始为加载状态）
      translationResult.show("" /* 初始无文本 */, text, resultPosition, true, handleSpeech);
      
      // 取消之前的翻译请求（如果有）
      if (cancelTranslation) {
        cancelTranslation();
        cancelTranslation = null;
      }
      
      // 开始流式翻译
      let translatedText = "";
      
      streamTranslate(
        {
          text,
          context,
          targetLanguage: "zh-CN", // 默认翻译为中文
        },
        {
          onChunk: (chunk) => {
            // 累积翻译结果
            translatedText += chunk;
            // 更新翻译结果框
            translationResult.update(translatedText, false);
          },
          onComplete: () => {
            console.log("[Lite Lingo] 翻译完成", { translatedText });
            // 更新翻译结果（非加载状态）
            translationResult.update(translatedText, false);
            cancelTranslation = null;
          },
          onError: (error) => {
            console.error("[Lite Lingo] 翻译错误:", error);
            // 显示错误信息
            translationResult.update(`翻译出错: ${error}`, false);
            cancelTranslation = null;
          },
        }
      ).then((cancel) => {
        cancelTranslation = cancel;
      });
    };
    
    // 处理朗读按钮点击
    const handleSpeech = (text: string) => {
      console.log("[Lite Lingo] 处理朗读请求", { text });
      
      // 使用浏览器内置的语音合成 API
      if ('speechSynthesis' in window) {
        // 取消之前的朗读
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        // 设置语言（可根据翻译目标语言动态设置）
        utterance.lang = 'zh-CN';
        
        window.speechSynthesis.speak(utterance);
      } else {
        console.error("[Lite Lingo] 浏览器不支持语音合成 API");
      }
    };

    // 监听选中文本事件
    console.log("[Lite Lingo] 注册 mouseup 事件监听器");
    document.addEventListener("mouseup", (event) => {
      console.log("[Lite Lingo] mouseup 事件触发", {
        x: event.clientX,
        y: event.clientY,
      });

      // 首先检查是否点击在气泡内部，如果是，则不处理
      const bubbleElement = document.getElementById("lite-lingo-bubble");
      if (bubbleElement && (event.target instanceof Node) && bubbleElement.contains(event.target)) {
        console.log("[Lite Lingo] 点击在气泡内部，不触发新气泡");
        return;
      }

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
        handleTranslate,
        handleSpeech
      );
    });

    // 点击页面其他区域时隐藏气泡和翻译结果
    console.log("[Lite Lingo] 注册 mousedown 事件监听器");
    document.addEventListener("mousedown", (event) => {
      console.log("[Lite Lingo] mousedown 事件触发", {
        target: (event.target as Element)?.tagName,
      });
      
      // 获取气泡容器元素
      const bubbleContainer = selectionBubble.getContainer();
      const resultContainer = translationResult.getContainer();
      
      // 检查点击是否在气泡或翻译结果内部
      const isClickInBubble = bubbleContainer && (event.target instanceof Node) && bubbleContainer.contains(event.target);
      const isClickInResult = resultContainer && (event.target instanceof Node) && resultContainer.contains(event.target);
      
      if (isClickInBubble) {
        console.log("[Lite Lingo] 点击在气泡内部，保持显示");
      } else if (isClickInResult) {
        console.log("[Lite Lingo] 点击在翻译结果内部，保持显示");
        // 隐藏气泡，但保留翻译结果
        selectionBubble.hide();
      } else {
        console.log("[Lite Lingo] 点击在气泡和翻译结果外部，准备隐藏");
        selectionBubble.hide();
        translationResult.hide();
        
        // 取消正在进行的翻译
        if (cancelTranslation) {
          cancelTranslation();
          cancelTranslation = null;
        }
        
        // 取消正在进行的朗读
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    });

    // 清理函数
    return () => {
      console.log("[Lite Lingo] 执行清理函数");
      selectionBubble.cleanup();
      translationResult.cleanup();
      
      // 取消正在进行的翻译
      if (cancelTranslation) {
        cancelTranslation();
        cancelTranslation = null;
      }
      
      // 取消正在进行的朗读
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  },
});
