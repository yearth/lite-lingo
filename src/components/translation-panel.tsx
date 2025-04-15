import { CloseIcon, CopyIcon, SpeakIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
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
import { useEffect, useRef, useState } from "react";

export function TranslationPanel() {
  const {
    isVisible,
    position,
    originalText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    isLoading,
    setVisibility,
  } = useTranslationStore();
  const { setVisibility: setSelectionVisibility } = useSelectionStore();

  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 自定义拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  const handleDragStart = (e: MouseEvent) => {
    console.log("拖拽开始", e.target);

    // 检查是否点击在拖拽把手上
    if (!(e.target as HTMLElement).closest(".panel-handle")) {
      console.log("不是在拖拽把手上点击");
      return;
    }

    console.log("拖拽把手点击成功");
    e.preventDefault();
    setIsDragging(true);

    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startX: dragOffset.x,
      startY: dragOffset.y,
    };

    console.log("设置拖拽起始位置", dragStartPos.current);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartPos.current) return;

    console.log("拖拽移动中", e.clientX, e.clientY);
    e.preventDefault();

    const newX =
      dragStartPos.current.startX + (e.clientX - dragStartPos.current.x);
    const newY =
      dragStartPos.current.startY + (e.clientY - dragStartPos.current.y);

    console.log("计算新位置", newX, newY);
    setDragOffset({
      x: newX,
      y: newY,
    });
  };

  const handleDragEnd = () => {
    console.log("拖拽结束");
    setIsDragging(false);
    dragStartPos.current = null;
  };

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

  // 设置 Portal 的根元素
  useEffect(() => {
    // 获取 shadow root
    const shadowRoot = document.querySelector("selection-popup")?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;
      // 创建一个 portal 容器
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
    // 关闭翻译面板时保持划词气泡隐藏状态
    setVisibility(false);
    setSelectionVisibility(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    // 使用 composedPath 来获取事件路径，包括 Shadow DOM
    const path = e.composedPath();
    const target = path[0] as Node;

    if (!panelRef.current) return;

    // 如果点击目标不在面板内，则关闭面板
    if (!panelRef.current.contains(target as Node)) {
      console.log("点击在面板外部，关闭面板");
      handleClose();
    }
  };

  // 单独为拖拽添加事件监听
  useEffect(() => {
    if (!panelRef.current) return;

    console.log("为面板添加拖拽事件监听");

    // 使用事件冒泡的方式处理拖拽
    const panel = panelRef.current;

    panel.addEventListener("mousedown", handleDragStart as EventListener);
    document.addEventListener("mousemove", handleDragMove as EventListener);
    document.addEventListener("mouseup", handleDragEnd as EventListener);

    return () => {
      panel.removeEventListener("mousedown", handleDragStart as EventListener);
      document.removeEventListener(
        "mousemove",
        handleDragMove as EventListener
      );
      document.removeEventListener("mouseup", handleDragEnd as EventListener);
    };
  }, [panelRef.current, isDragging]); // 确保在拖拽状态变化时重新绑定事件

  // 添加点击外部关闭事件
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
  }, [isVisible, isDragging]);

  useEffect(() => {
    console.log("拖拽偏移量更新:", dragOffset);
  }, [dragOffset]);

  if (!portalRef.current) return null;

  // 合并拖拽偏移量到位置样式
  const combinedStyles = {
    ...floatingStyles,
    transform: `${floatingStyles.transform || ""} translate(${
      dragOffset.x
    }px, ${dragOffset.y}px)`,
  };

  console.log("应用样式:", combinedStyles);

  return (
    <FloatingPortal root={portalRef.current}>
      <AnimatePresence>
        {isVisible && (
          <div
            ref={refs.setFloating}
            style={combinedStyles}
            className="fixed z-[999]"
          >
            <motion.div
              ref={panelRef}
              className="bg-white rounded-lg shadow-lg select-none flex flex-col overflow-hidden"
              style={{
                width: "360px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                cursor: isDragging ? "grabbing" : "default",
              }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{
                duration: 0.1,
                ease: "easeOut",
              }}
            >
              {/* Header 部分 - 可拖动区域 */}
              <div
                className="p-3 border-b border-gray-100 flex items-center justify-between bg-white panel-handle"
                style={{
                  cursor: isDragging ? "grabbing" : "grab",
                }}
              >
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium">翻译</h3>
                  <div className="text-xs text-gray-500 flex items-center">
                    <span>
                      {sourceLanguage === "auto" ? "自动检测" : sourceLanguage}
                    </span>
                    <span className="mx-1">→</span>
                    <span>{targetLanguage}</span>
                  </div>
                </div>
                <IconButton
                  icon={<CloseIcon />}
                  tooltipContent="关闭"
                  onClick={handleClose}
                />
              </div>

              {/* Content 部分 */}
              <div className="flex flex-col flex-1 overflow-auto">
                {/* 原文区域 */}
                <div className="p-3 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    {originalText || "无内容"}
                  </p>
                </div>

                {/* 翻译结果区域 */}
                <div className="p-3 flex-1 min-h-[100px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-sm text-gray-500">翻译中...</span>
                    </div>
                  ) : (
                    <p className="text-sm">{translatedText || "等待翻译..."}</p>
                  )}
                </div>
              </div>

              {/* Footer 部分 */}
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
                    // 朗读功能
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
