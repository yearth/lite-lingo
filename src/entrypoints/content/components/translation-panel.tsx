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
import { useEffect, useRef } from "react";

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

  if (!portalRef.current) return null;

  const combinedStyles = {
    ...floatingStyles,
    transform: `${floatingStyles.transform || ""} translate(${
      dragOffset.x
    }px, ${dragOffset.y}px)`,
    zIndex: 9999,
  };

  return (
    <FloatingPortal root={portalRef.current}>
      {/* 添加滚动条样式 */}
      <InlineStyle css={scrollbarCSS} />

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
                <div className="p-3 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    {originalText || "无内容"}
                  </p>
                </div>

                <div className="p-3 flex-1 min-h-[100px] max-h-[120px] bg-white overflow-y-auto overflow-x-hidden result-content">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-sm text-gray-500">翻译中...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 break-words">
                      {translatedText ? translatedText : "等待翻译..."}
                      <br />
                      <span className="text-xs text-gray-400">
                        调试信息:{" "}
                        {JSON.stringify({
                          translatedText,
                          originalText,
                          isLoading,
                          isDragging,
                          dragOffset,
                        })}
                      </span>
                      {/* 测试滚动区域 */}
                      <span className="block mt-2 text-xs text-gray-400">
                        测试滚动 1<br />
                        测试滚动 2<br />
                        测试滚动 3<br />
                        测试滚动 4<br />
                        测试滚动 5<br />
                        测试滚动 6<br />
                        测试滚动 7<br />
                        测试滚动 8<br />
                        测试滚动 9<br />
                        测试滚动 10
                        <br />
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2 border-t border-gray-100 flex justify-end space-x-1 bg-white">
                <IconButton
                  icon={<CopyIcon />}
                  tooltipContent="复制翻译结果"
                  onClick={() => {
                    if (translatedText) {
                      navigator.clipboard.writeText(translatedText);
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
