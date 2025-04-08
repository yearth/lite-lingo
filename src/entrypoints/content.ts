import { SelectionBubbleManager } from "../components/selection-bubble.tsx";
import { TranslationResultManager } from "../components/translation-result"; // Updated import path
import {
  getTextContext,
  isEditableElement,
  isInShadowDOM,
} from "../utils/text-selection";
// import { streamTranslate } from "../utils/translation-service"; // Removed: Use messaging instead
import {
  type BackgroundRequestMessage,
  type BackgroundResponseMessage,
  type ContentScriptStreamMessage,
  isStreamCompleteMessage,
  isStreamErrorMessage,
  isStreamEventMessage, // Ensure this is imported
  MSG_TYPE_MUTATION_REQUEST_TTS,
  MSG_TYPE_MUTATION_TRANSLATE_STREAM,
  type RequestTtsPayload,
  type TranslateStreamPayload,
} from "../types/messaging";

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

    // // 用于存储取消翻译的函数 - Removed: Cancellation logic might be handled differently via messaging
    // let cancelTranslation: (() => void) | null = null;

    // 处理翻译按钮点击
    const handleTranslate = (text: string, context: string) => {
      console.log("[Lite Lingo] 发送翻译请求消息", { text, context });

      // 获取气泡位置，用于定位翻译结果框
      const bubbleElement = document.getElementById("lite-lingo-bubble");
      if (!bubbleElement) return;

      const bubbleRect = bubbleElement.getBoundingClientRect();
      const resultPosition = {
        x: bubbleRect.left + bubbleRect.width / 2,
        y: bubbleRect.bottom,
      };

      // 显示翻译结果框（初始为加载状态）
      translationResult.show(
        "" /* 初始无文本 */,
        text,
        resultPosition,
        true,
        handleSpeech // Pass the new handleSpeech
      );

      // // 取消之前的翻译请求 - Removed: Handled differently now
      // if (cancelTranslation) {
      //   cancelTranslation();
      //   cancelTranslation = null;
      // }

      // 构建消息
      const message: BackgroundRequestMessage<TranslateStreamPayload> = {
        type: MSG_TYPE_MUTATION_TRANSLATE_STREAM,
        payload: {
          text,
          context: context || "", // Ensure context is always a string
          targetLanguage: "zh-CN", // Or get from settings later
        },
      };

      // 发送消息到 Background Script
      chrome.runtime.sendMessage(
        message,
        (response: BackgroundResponseMessage) => {
          // 这个回调主要处理 *启动* 流式请求时的即时错误
          // 流式数据块将通过下面的 onMessage 监听器接收
          if (chrome.runtime.lastError) {
            console.error(
              "[Lite Lingo] 发送翻译请求失败:",
              chrome.runtime.lastError.message
            );
            translationResult.update(
              `启动翻译失败: ${chrome.runtime.lastError.message}`,
              false
            );
            return;
          }

          if (!response?.success) {
            console.error("[Lite Lingo] 启动翻译请求失败:", response?.error);
            translationResult.update(
              `启动翻译失败: ${response?.error || "未知错误"}`,
              false
            );
          } else {
            console.log("[Lite Lingo] 翻译流已成功启动");
            // 初始加载状态已在 translationResult.show 中设置
            // 等待 onMessage 接收数据块
          }
        }
      );
    };

    // 处理朗读按钮点击 (改为发送消息)
    const handleSpeech = (text: string) => {
      console.log("[Lite Lingo] 发送朗读请求消息", { text });

      const message: BackgroundRequestMessage<RequestTtsPayload> = {
        type: MSG_TYPE_MUTATION_REQUEST_TTS,
        payload: {
          text,
          language: "zh", // 假设当前只朗读中文翻译结果
        },
      };

      chrome.runtime.sendMessage(
        message,
        (response: BackgroundResponseMessage) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[Lite Lingo] 发送朗读请求失败:",
              chrome.runtime.lastError.message
            );
            // 可选：显示错误给用户，例如在结果框短暂提示
            return;
          }
          if (!response?.success) {
            console.error("[Lite Lingo] 朗读请求失败:", response?.error);
            // 可选：显示错误给用户
          } else {
            console.log("[Lite Lingo] 朗读请求已发送");
            // Background script 会处理实际的 TTS
          }
        }
      );
    };

    // --- 更新：监听来自 Background 的流式消息 ---
    // let currentTranslatedText = ""; // Removed: No longer accumulating simple text
    // Add state for dictionary if needed
    let currentDictionaryEntry: any = null; // Simple state for dictionary context

    chrome.runtime.onMessage.addListener(
      (message: ContentScriptStreamMessage, sender, sendResponse) => {
        // 确保消息来自 background
        // 实际应用中可能不需要这个检查，除非有其他扩展或脚本可能发送消息
        // if (!sender.tab) { // 消息来自扩展内部，非 content script 发给 content script
        // }

        console.log("[Lite Lingo] Received message:", message);
        console.log(
          "[Lite Lingo] Received message isStreamEventMessage:",
          isStreamEventMessage(message)
        );

        if (isStreamEventMessage(message)) {
          const streamEvent = message.payload; // No need for assertion if type guard is correct
          const eventPayload = streamEvent.payload;

          // TODO: Update TranslationResultManager/Component to render structured data
          console.log(
            `[Lite Lingo] Processing Stream Event: ${streamEvent.type}`,
            eventPayload
          );

          switch (streamEvent.type) {
            case "analysis_info":
              // Optional: Update UI based on input type if needed
              console.log(
                "[Lite Lingo] Analysis Info:",
                eventPayload?.inputType,
                eventPayload?.sourceText
              );
              // Example: translationResult.showAnalysisInfo(eventPayload);
              break;
            case "context_explanation":
              console.log(
                "[Lite Lingo] Context Explanation:",
                eventPayload?.text
              );
              // Assuming TranslationResultManager has this method
              translationResult.updateContextExplanation(
                eventPayload?.text ?? ""
              );
              break;
            case "dictionary_start":
              console.log("[Lite Lingo] Dictionary Start:", eventPayload);
              // Initialize local state for the dictionary entry
              currentDictionaryEntry = {
                ...(eventPayload ?? {}), // Start with payload data (word, translation, phonetic)
                definitions: [], // Initialize definitions array
              };
              // Assuming TranslationResultManager has this method
              translationResult.startDictionary(currentDictionaryEntry);
              break;
            case "definition":
              if (currentDictionaryEntry) {
                console.log("[Lite Lingo] Definition:", eventPayload);
                const newDefinition = {
                  ...(eventPayload ?? {}), // Get pos and def
                  examples: [], // Initialize examples for this definition
                };
                currentDictionaryEntry.definitions.push(newDefinition);
                // Assuming TranslationResultManager has this method
                translationResult.addDefinition(newDefinition);
              } else {
                console.warn(
                  "[Lite Lingo] Received 'definition' event without active dictionary entry."
                );
              }
              break;
            case "example":
              if (
                currentDictionaryEntry &&
                currentDictionaryEntry.definitions.length > 0
              ) {
                console.log("[Lite Lingo] Example:", eventPayload);
                const lastDefinition =
                  currentDictionaryEntry.definitions[
                    currentDictionaryEntry.definitions.length - 1
                  ];
                // Ensure examples array exists on the last definition
                lastDefinition.examples = lastDefinition.examples || [];
                lastDefinition.examples.push(eventPayload ?? {}); // Add the example payload
                // Assuming TranslationResultManager has this method
                translationResult.addExample(eventPayload ?? {});
              } else {
                console.warn(
                  "[Lite Lingo] Received 'example' event without active definition."
                );
              }
              break;
            case "dictionary_end":
              console.log("[Lite Lingo] Dictionary End");
              // Assuming TranslationResultManager might have a method for this, e.g., for styling
              translationResult.endDictionary?.(); // Optional chaining if method might not exist
              currentDictionaryEntry = null; // Reset local state
              break;
            case "translation_result":
              console.log(
                "[Lite Lingo] Translation Result:",
                eventPayload?.text
              );
              // Use the existing update method to show the main translation text
              // Keep loading indicator active (true) as 'done' event hasn't arrived yet
              translationResult.update(eventPayload?.text ?? "", true);
              break;
            // Errors reported within the stream are handled by isStreamErrorMessage block
            // case "fragment_error":
            // case "parsing_error": // Handled by isStreamErrorMessage
            // case "error":         // Handled by isStreamErrorMessage
            // case "done":          // Handled by isStreamCompleteMessage
            //    break;
            default:
              // Log unhandled specific stream event types
              console.warn(
                "[Lite Lingo] Received unhandled stream event type:",
                streamEvent.type
              );
          }
        } else if (isStreamErrorMessage(message)) {
          console.error(
            "[Lite Lingo] Received stream error:",
            message.payload.error
          );
          // Update UI to show the error message
          translationResult.update(`翻译出错: ${message.payload.error}`, false); // End loading state
          currentDictionaryEntry = null; // Reset dictionary state on error
        } else if (isStreamCompleteMessage(message)) {
          console.log(
            "[Lite Lingo] Received stream complete signal:",
            message.payload.status
          );
          // Finalize UI state, end loading indicator
          // The last text update might have already happened via a 'translation_result' event
          // We just need to turn off the loading state.
          // We might need to get the final accumulated text if the UI manager doesn't store it.
          // For now, assume the last update was sufficient and just turn off loading.
          translationResult.setLoading(false);
          currentDictionaryEntry = null; // Reset dictionary state
          if (message.payload.status === "failed") {
            // Optionally display a generic failure message if no specific error was shown
            // translationResult.showError("翻译失败");
          }
        } else {
          console.log(
            "[Lite Lingo] Received unknown or non-stream message, ignoring"
          );
        }

        // 对于 onMessage，如果不需要异步发送响应，可以不返回 true
        // return true; // 只有在需要异步调用 sendResponse 时返回 true
      }
    );

    // 监听选中文本事件
    console.log("[Lite Lingo] 注册 mouseup 事件监听器");
    document.addEventListener("mouseup", (event) => {
      console.log("[Lite Lingo] mouseup 事件触发", {
        x: event.clientX,
        y: event.clientY,
      });

      // 首先检查是否点击在气泡内部，如果是，则不处理
      const bubbleElement = document.getElementById("lite-lingo-bubble");
      if (
        bubbleElement &&
        event.target instanceof Node &&
        bubbleElement.contains(event.target)
      ) {
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

      // 显示气泡在选区位置
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        selectionBubble.show(
          selectedText,
          context,
          {
            clientRect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          },
          handleTranslate,
          handleSpeech
        );
      }
    });

    // 点击页面其他区域时隐藏气泡和翻译结果
    console.log("[Lite Lingo] 注册 mousedown 事件监听器");
    document.addEventListener("mousedown", (event) => {
      console.log("[Lite Lingo] mousedown 事件触发", {
        target: (event.target as Element)?.tagName,
      });

      // Reset dictionary state on external click
      currentDictionaryEntry = null;

      // 获取气泡容器元素
      const bubbleContainer = selectionBubble.getContainer();
      const resultContainer = translationResult.getContainer();

      // 检查点击是否在气泡或翻译结果内部
      const isClickInBubble =
        bubbleContainer &&
        event.target instanceof Node &&
        bubbleContainer.contains(event.target);
      const isClickInResult =
        resultContainer &&
        event.target instanceof Node &&
        resultContainer.contains(event.target);

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

        // // 取消正在进行的翻译 - Removed: Handled differently now
        // if (cancelTranslation) {
        //   cancelTranslation();
        //   cancelTranslation = null;
        // }
        // TODO: Consider sending a "cancel" message to background if needed

        // 取消正在进行的朗读 - Background script should handle TTS cancellation if needed.
        // window.speechSynthesis.cancel(); // Removed from content script
        // } // Removed extra closing brace
      }
    });

    // 清理函数
    return () => {
      console.log("[Lite Lingo] 执行清理函数");
      selectionBubble.cleanup();
      translationResult.cleanup();

      // // 取消正在进行的翻译 - Removed
      // if (cancelTranslation) {
      //   cancelTranslation();
      //   cancelTranslation = null;
      // }

      // // 取消正在进行的朗读 - Removed
      // if ("speechSynthesis" in window) {
      //   window.speechSynthesis.cancel();
      // }

      // 移除 onMessage 监听器 - WXT/Browser handles this on script unload.
      // Manual removal requires storing the listener function reference.
    };
  },
});
