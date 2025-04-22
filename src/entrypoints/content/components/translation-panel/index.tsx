import { useDraggable } from "@/hooks/use-draggable";
import { useFixedFloating } from "@/hooks/use-fixed-floating";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { useTranslationPanel } from "@/hooks/use-translation-panel";
import { flip, offset, shift, useFloating } from "@floating-ui/react";
import { AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { cursorCSS, lineClampCSS, scrollbarCSS } from "./constants.style";
import {
  PanelContainer,
  PanelHandle,
  PanelHeader,
  PanelToolbar,
} from "./panel-ui";
import { TranslationContent } from "./translation-content";
import { TranslationPortal } from "./translation-portal";

export function TranslationPanel() {
  // 获取面板状态和操作
  const { panelState, panelActions } = useTranslationPanel();
  const {
    isVisible,
    position,
    translatedText,
    parsedContent,
    sourceLanguage,
    targetLanguage,
    isPinned,
    originalText,
    isLoading,
    activeRequestId,
    translationType,
    shouldShowCursor,
  } = panelState;
  const { handleClose, togglePinned } = panelActions;

  // 面板引用
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 拖拽逻辑
  const { isDragging, dragOffset, resetDragOffset } = useDraggable(panelRef, {
    handleSelector: ".panel-handle",
    disabled: !isVisible,
    inShadowDOM: true,
  });

  // 浮动定位逻辑 - 使用useFloating获取完整结果
  const floating = useFloating({
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
  });

  // 固定位置逻辑 - 传入整个floating对象
  const { finalStyles } = useFixedFloating({
    isVisible,
    position,
    floating,
    dragOffset,
    resetDragOffset,
  });

  // 点击外部关闭逻辑
  useOutsideClick({
    elementRef: panelRef,
    isVisible,
    isDragging,
    isPinned,
    onClose: handleClose,
  });

  return (
    <TranslationPortal
      styles={{
        scrollbarCSS,
        cursorCSS,
        lineClampCSS,
      }}
    >
      <AnimatePresence>
        {isVisible && (
          <div
            ref={floating.refs.setFloating}
            style={finalStyles}
            className="fixed z-[999]"
            data-testid="translation-panel"
          >
            <PanelContainer ref={panelRef} isDragging={isDragging}>
              <PanelHandle />
              <PanelToolbar
                isPinned={isPinned}
                togglePinned={togglePinned}
                onClose={handleClose}
              />
              <PanelHeader
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
              />
              <div className="h-[120px] rounded-md border overflow-auto flex flex-col p-3">
                <TranslationContent
                  isLoading={isLoading}
                  translatedText={translatedText}
                  originalText={originalText}
                  parsedContent={parsedContent}
                  translationType={translationType}
                  activeRequestId={activeRequestId}
                  shouldShowCursor={shouldShowCursor}
                />
              </div>
            </PanelContainer>
          </div>
        )}
      </AnimatePresence>
    </TranslationPortal>
  );
}
