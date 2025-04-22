import { useTranslationStore } from "@/store/translation";
import { useEffect } from "react";

/**
 * 处理接收后台消息的组件
 * 不渲染任何UI，只负责消息处理和状态更新
 */
export const TranslationHandler = () => {
  // 获取状态更新函数
  const updateTranslationStore = useTranslationStore();

  // 监听来自后台的消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      // 仅处理SSE相关消息
      if (!message || !message.type) return;

      console.log(
        "[ Translation Handler ] 收到消息:",
        message.type,
        message.requestId
      );

      // 处理JSON模式的数据块
      if (message.type === "SSE_CHUNK" && message.data.isJsonMode) {
        const { json, isPartial } = message.data;
        console.log("[ Translation Handler ] JSON数据:", json);

        // 更新翻译面板状态
        updateTranslationStore.setTranslatedText(""); // 清空文本模式的翻译结果
        updateTranslationStore.setParsedContent(json); // 设置解析后的JSON内容
        updateTranslationStore.setLoading(isPartial); // 如果还有后续数据，保持loading状态
      }

      // 处理文本模式的数据块
      else if (message.type === "SSE_CHUNK" && message.data.isTextMode) {
        const { text, isPartial } = message.data;

        // 更新文本翻译结果
        updateTranslationStore.setTranslatedText(text);
        updateTranslationStore.setLoading(isPartial);
      }

      // 处理JSON完成消息
      else if (message.type === "SSE_JSON_COMPLETE") {
        // 标记加载完成
        updateTranslationStore.setLoading(false);
      }

      // 处理文本完成消息
      else if (message.type === "SSE_TEXT_COMPLETE") {
        // 标记加载完成
        updateTranslationStore.setLoading(false);
      }
    };

    // 添加消息监听器
    chrome.runtime.onMessage.addListener(handleMessage);

    // 清理函数
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [updateTranslationStore]);

  // 此组件不渲染任何内容
  return null;
};
