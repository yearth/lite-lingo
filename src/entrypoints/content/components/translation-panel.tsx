import { CloseIcon, CopyIcon, PinIcon, SpeakIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { useDraggable } from "@/hooks/use-draggable";
import { useSelectionStore } from "@/store/selection";
import { useTranslationStore } from "@/store/translation";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

// 内联CSS组件
const InlineStyle = ({ css }: { css: string }) => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
);

export function TranslationPanel() {
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
    setVisibility,
    togglePinned,
    setActiveRequestId,
  } = useTranslationStore();
  const { setVisibility: setSelectionVisibility } = useSelectionStore();

  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { isDragging, dragOffset, resetDragOffset } = useDraggable(panelRef, {
    handleSelector: ".panel-handle",
    disabled: !isVisible,
    inShadowDOM: true,
  });

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    strategy: "fixed",
    middleware: [
      offset({
        mainAxis: 10,
        crossAxis: 40,
      }),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const shadowRoot = document.querySelector("selection-popup")?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;

      const portalContainer = document.createElement("div");
      portalContainer.id = "translation-panel-root";
      shadowRoot.appendChild(portalContainer);
      portalRef.current = portalContainer;

      return () => {
        shadowRoot.removeChild(portalContainer);
        portalRef.current = null;
        shadowRootRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (isVisible && position) {
      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: position.x,
            y: position.y,
            top: position.y,
            right: position.x,
            bottom: position.y,
            left: position.x,
            toJSON() {
              return this;
            },
          };
        },
      });
    }
  }, [isVisible, position]);

  const handleClose = () => {
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
  };

  const handleClickOutside = (e: MouseEvent) => {
    const path = e.composedPath();
    const target = path[0] as Node;

    if (!panelRef.current) return;

    if (isPinned) return;

    if (!panelRef.current.contains(target as Node)) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isVisible && !isDragging) {
        handleClickOutside(e);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isVisible, isDragging, isPinned]);

  useEffect(() => {
    if (!isVisible) {
      resetDragOffset();
    }
  }, [isVisible, resetDragOffset]);

  // 自定义滚动条CSS
  const scrollbarCSS = `
    /* 给结果区域添加自定义滚动条 */
    .result-content::-webkit-scrollbar {
      width: 2px !important;
      height: 0px !important;
    }
    .result-content::-webkit-scrollbar-track {
      background-color: transparent !important;
    }
    .result-content::-webkit-scrollbar-thumb {
      background-color: transparent !important;
      border-radius: 2px !important;
      transition: background-color 0.2s ease-in-out !important;
    }
    .result-content:hover::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.15) !important;
    }
    /* 确保Firefox也有同样的效果 */
    .result-content {
      scrollbar-width: thin !important;
      scrollbar-color: transparent transparent !important;
      transition: scrollbar-color 0.2s ease-in-out !important;
    }
    .result-content:hover {
      scrollbar-color: rgba(0, 0, 0, 0.15) transparent !important;
    }
  `;

  // 添加光标CSS动画
  const cursorCSS = `
    .typing-cursor {
      display: inline-block;
      width: 5px;
      height: 5px;
      background-color: #000;
      margin-left: 2px;
      margin-right: 1px;
      border-radius: 50%;
      vertical-align: middle;
      animation: blink 0.7s infinite;
      position: relative;
      bottom: 1px;
    }

    @keyframes blink {
      0% { opacity: 1; }
      50% { opacity: 0; }
      100% { opacity: 1; }
    }
  `;

  // 追踪上一次的翻译文本，用于判断是否仍在流式传输
  const lastTranslatedTextRef = useRef<string>("");

  // 检测翻译文本变化，判断是否处于流式翻译中
  useEffect(() => {
    if (translatedText && translatedText !== lastTranslatedTextRef.current) {
      lastTranslatedTextRef.current = translatedText;
    }
  }, [translatedText]);

  // 判断是否应该显示光标
  const shouldShowCursor = useMemo(() => {
    // 只在流式翻译过程中显示光标：有内容，正在加载，且内容在变化
    return (
      translatedText &&
      isLoading &&
      translatedText !== "正在翻译..." &&
      activeRequestId !== null
    ); // 确保有活跃的请求ID
  }, [translatedText, isLoading, activeRequestId]);

  if (!portalRef.current) return null;

  const combinedStyles = {
    ...floatingStyles,
    transform: `${floatingStyles.transform || ""} translate(${
      dragOffset.x
    }px, ${dragOffset.y}px)`,
    zIndex: 9999,
  };

  const renderContent = () => {
    // 显示加载状态
    if (isLoading && !parsedContent.analysisInfo && !translatedText) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="text-sm text-gray-500">翻译中...</span>
        </div>
      );
    }

    // 优先处理纯文本模式（当存在translatedText时）
    if (translatedText) {
      return (
        <div className="translation-content space-y-4 p-4">
          {/* 原文区域 */}
          <div className="original-text">
            <p className="text-sm text-gray-700 select-text whitespace-pre-wrap break-words">
              {originalText}
            </p>
          </div>

          {/* 翻译结果区域 - 纯文本模式 */}
          <div className="sentence-translation mt-2">
            <p className="text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
              {translatedText}
              {/* 只在流式翻译进行中显示光标 */}
              {shouldShowCursor && <span className="typing-cursor"></span>}
            </p>
          </div>
        </div>
      );
    }

    const { inputType } = parsedContent.analysisInfo || {};

    return (
      <div className="translation-content space-y-4">
        {/* 原文区域 */}
        <div className="original-text">
          <p className="text-sm text-gray-700 select-text">
            {parsedContent.analysisInfo?.sourceText || originalText}
          </p>
        </div>

        {/* 翻译结果区域 */}
        {inputType === "word_or_phrase" ? (
          <>
            {/* 单词/短语布局 */}
            {parsedContent.dictionary && (
              <div className="word-info">
                <div className="phonetic text-sm text-gray-500">
                  {parsedContent.dictionary.phonetic}
                </div>
                <div className="translation text-base">
                  {parsedContent.context?.word_translation}
                </div>
                <div className="definitions mt-2">
                  {parsedContent.dictionary.definitions.map((def, index) => (
                    <div key={index} className="definition-item mt-1">
                      <div className="definition text-sm">{def.definition}</div>
                      <div className="example text-xs text-gray-500">
                        {def.example}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* 句子布局 */}
            <div className="sentence-translation">
              {parsedContent.context?.explanation}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <FloatingPortal root={portalRef.current}>
      {/* 添加滚动条样式 */}
      <InlineStyle css={scrollbarCSS} />

      {/* 添加光标动画样式 */}
      <InlineStyle css={cursorCSS} />

      <AnimatePresence>
        {isVisible && (
          <div
            ref={refs.setFloating}
            style={combinedStyles}
            className="fixed z-[999]"
            data-testid="translation-panel"
          >
            <motion.div
              ref={panelRef}
              className="bg-white rounded-lg shadow-lg select-none flex flex-col overflow-hidden will-change-transform text-gray-800"
              style={{
                width: "360px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                cursor: isDragging ? "grabbing" : "default",
                position: "relative",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: 0.1,
                ease: "easeOut",
              }}
            >
              <div
                className="panel-handle absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab z-10"
                style={{
                  backgroundColor: "transparent",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                }}
                title="拖动移动面板"
              >
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              <div className="absolute top-2 right-2 flex space-x-1 z-20">
                <IconButton
                  icon={<PinIcon filled={isPinned} />}
                  tooltipContent={isPinned ? "取消固定" : "固定面板"}
                  onClick={togglePinned}
                />
                <IconButton
                  icon={<CloseIcon />}
                  tooltipContent="关闭"
                  onClick={handleClose}
                />
              </div>

              <div className="p-3 pt-6 border-b border-gray-100 flex items-center justify-start bg-white">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-800">翻译</h3>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span>
                      {sourceLanguage === "auto" ? "自动检测" : sourceLanguage}
                    </span>
                    <span className="mx-1">→</span>
                    <span>{targetLanguage}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col flex-1 overflow-hidden">
                {renderContent()}
              </div>

              <div className="p-2 border-t border-gray-100 flex justify-end space-x-1 bg-white">
                <IconButton
                  icon={<CopyIcon />}
                  tooltipContent="复制翻译结果"
                  onClick={() => {
                    if (parsedContent.analysisInfo?.sourceText) {
                      navigator.clipboard.writeText(
                        parsedContent.analysisInfo.sourceText
                      );
                    }
                  }}
                />
                <IconButton
                  icon={<SpeakIcon />}
                  tooltipContent="朗读翻译结果"
                  onClick={() => {
                    console.log("朗读翻译结果");
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
