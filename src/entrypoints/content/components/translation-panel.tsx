import { CloseIcon, CopyIcon, PinIcon, SpeakIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraggable } from "@/hooks/use-draggable";
import { useSelectionStore } from "@/store/selection";
import { TranslationType, useTranslationStore } from "@/store/translation";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

// 内联CSS组件
const InlineStyle = ({ css }: { css: string }) => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
);

// 单词翻译组件
const WordTranslationView = ({
  originalText,
  parsedContent,
  shouldShowCursor,
  translatedText,
}: {
  originalText: string;
  parsedContent: any;
  shouldShowCursor: boolean;
  translatedText: string;
}) => {
  const { inputType } = parsedContent.analysisInfo || {};

  // 如果没有解析内容，使用简单文本模式
  if (!parsedContent.dictionary && translatedText) {
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
            {shouldShowCursor && <span className="typing-cursor"></span>}
          </p>
        </div>
      </div>
    );
  }

  // 有结构化词典数据的展示
  return (
    <div className="translation-content space-y-4 p-4">
      {/* 原文区域 */}
      <div className="original-text">
        <p className="text-sm text-gray-700 select-text">
          {parsedContent.analysisInfo?.sourceText || originalText}
        </p>
      </div>

      {/* 翻译结果区域 - 单词布局 */}
      <div className="word-translation">
        {parsedContent.dictionary && (
          <div className="word-info">
            <div className="phonetic text-sm text-gray-500">
              {parsedContent.dictionary.phonetic}
            </div>
            <div className="translation text-base">
              {parsedContent.context?.word_translation}
            </div>
            <div className="definitions mt-2">
              {parsedContent.dictionary.definitions.map(
                (def: any, index: number) => (
                  <div key={index} className="definition-item mt-1">
                    <div className="definition text-sm">{def.definition}</div>
                    <div className="example text-xs text-gray-500">
                      {def.example}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 句子翻译组件
const SentenceTranslationView = ({
  originalText,
  translatedText,
  shouldShowCursor,
}: {
  originalText: string;
  translatedText: string;
  shouldShowCursor: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="translation-content space-y-4 p-4">
      {/* 可折叠原文区域 */}
      <div className="original-text-container">
        <p
          className={`text-sm text-gray-700 select-text whitespace-pre-wrap break-words ${
            isExpanded ? "" : "line-clamp-1"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {originalText}
        </p>
        {originalText.length > 50 && (
          <button
            className="text-xs text-blue-500 mt-1 hover:underline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "收起" : "展开"}
          </button>
        )}
      </div>

      {/* 翻译结果 */}
      <div className="sentence-translation mt-2">
        <p className="text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
          {translatedText}
          {shouldShowCursor && <span className="typing-cursor"></span>}
        </p>
      </div>
    </div>
  );
};

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
    translationType,
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
            x: position.x - window.scrollX,
            y: position.y - window.scrollY,
            top: position.y - window.scrollY,
            right: position.x - window.scrollX,
            bottom: position.y - window.scrollY,
            left: position.x - window.scrollX,
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

  // 行截断CSS
  const lineClampCSS = `
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
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
    // 显示基本加载状态
    if (isLoading && !translatedText) {
      return (
        <div className="flex flex-col space-y-4 p-4 w-full">
          {/* 使用骨架屏代替文本提示 */}
          <Skeleton className="h-4 w-3/4 bg-gray-200" />
          <Skeleton className="h-4 w-1/2 bg-gray-200" />
          <Skeleton className="h-20 w-full bg-gray-200" />
          <Skeleton className="h-4 w-5/6 bg-gray-200" />
          <Skeleton className="h-4 w-2/3 bg-gray-200" />
        </div>
      );
    }

    // 使用AnimatePresence进行平滑过渡
    return (
      <AnimatePresence>
        {translationType === TranslationType.SENTENCE ? (
          <motion.div
            key="sentence-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SentenceTranslationView
              originalText={originalText}
              translatedText={translatedText}
              shouldShowCursor={!!shouldShowCursor}
            />
          </motion.div>
        ) : translationType === TranslationType.WORD ? (
          <motion.div
            key="word-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <WordTranslationView
              originalText={originalText}
              parsedContent={parsedContent}
              shouldShowCursor={!!shouldShowCursor}
              translatedText={translatedText}
            />
          </motion.div>
        ) : (
          <motion.div
            key="loading-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col space-y-4 p-4 w-full">
              {/* 使用骨架屏代替文本提示 */}
              <Skeleton className="h-4 w-3/4 bg-gray-200" />
              <Skeleton className="h-4 w-1/2 bg-gray-200" />
              <Skeleton className="h-20 w-full bg-gray-200" />
              <Skeleton className="h-4 w-5/6 bg-gray-200" />
              <Skeleton className="h-4 w-2/3 bg-gray-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <FloatingPortal root={portalRef.current}>
      {/* 添加样式 */}
      <InlineStyle css={scrollbarCSS} />
      <InlineStyle css={cursorCSS} />
      <InlineStyle css={lineClampCSS} />

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
                  icon={<PinIcon filled={!!isPinned} />}
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
                    if (translatedText) {
                      navigator.clipboard.writeText(translatedText);
                    } else if (parsedContent.analysisInfo?.sourceText) {
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
