import { useSelectionStore } from "@/store/selection";
import { useTranslationStore } from "@/store/translation";
import { useCallback, useEffect, useRef } from "react";

/**
 * 翻译面板专用钩子，封装面板相关的逻辑
 */
export function useTranslationPanel() {
  const {
    isVisible,
    position,
    originalText,
    translatedText,
    parsedContent,
    sourceLanguage,
    targetLanguage,
    isLoading,
    isPinned,
    activeRequestId,
    translationType,
    setVisibility,
    togglePinned,
    setActiveRequestId,
  } = useTranslationStore();

  const { setVisibility: setSelectionVisibility } = useSelectionStore();

  // 追踪上一次的翻译文本，用于判断是否仍在流式传输
  const lastTranslatedTextRef = useRef<string>("");

  // 检测翻译文本变化，判断是否处于流式翻译中
  useEffect(() => {
    if (translatedText && translatedText !== lastTranslatedTextRef.current) {
      lastTranslatedTextRef.current = translatedText;
    }
  }, [translatedText]);

  // 面板关闭处理函数
  const handleClose = useCallback(() => {
    if (activeRequestId) {
      console.log("[ Lite Lingo ] 取消活跃的翻译请求:", activeRequestId);
      chrome.runtime.sendMessage({
        type: "API_SSE_CANCEL",
        requestId: activeRequestId,
      });
      setActiveRequestId(null);
    }

    setVisibility(false);
    setSelectionVisibility(false);
  }, [
    activeRequestId,
    setActiveRequestId,
    setVisibility,
    setSelectionVisibility,
  ]);

  // 根据状态判断是否显示流式输入光标
  const shouldShowCursor = Boolean(
    translatedText &&
      isLoading &&
      translatedText !== "正在翻译..." &&
      activeRequestId !== null
  );

  return {
    // 传递所有必要的状态和处理函数
    panelState: {
      isVisible,
      position,
      originalText,
      translatedText,
      parsedContent,
      sourceLanguage,
      targetLanguage,
      isLoading,
      isPinned,
      activeRequestId,
      translationType,
      shouldShowCursor,
    },
    panelActions: {
      handleClose,
      togglePinned,
      setVisibility,
      setSelectionVisibility,
    },
  };
}
