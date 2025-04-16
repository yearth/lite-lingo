import {
  CloseIcon,
  CopyIcon,
  ExplainIcon,
  SpeakIcon,
  TranslateIcon,
} from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { useSelectionActions } from "@/entrypoints/content/hooks";
import { useSelectionStore } from "@/store/selection";
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

export function SelectionPopup() {
  const { position, isVisible } = useSelectionStore();
  const {
    handleTranslate,
    handleCopy,
    handleExplain,
    handleSpeak,
    handleClose,
  } = useSelectionActions();

  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    strategy: "fixed",
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });

  // 按钮配置
  const buttons = [
    {
      icon: <CopyIcon />,
      tooltip: "复制",
      action: handleCopy,
    },
    {
      icon: <ExplainIcon />,
      tooltip: "解释",
      action: handleExplain,
    },
    {
      icon: <TranslateIcon />,
      tooltip: "翻译",
      action: handleTranslate,
    },
    {
      icon: <SpeakIcon />,
      tooltip: "朗读",
      action: handleSpeak,
    },
    {
      icon: <CloseIcon />,
      tooltip: "关闭",
      action: handleClose,
    },
  ];

  // 设置 Portal 的根元素
  useEffect(() => {
    // 获取 shadow root
    const shadowRoot = document.querySelector("selection-popup")?.shadowRoot;
    if (shadowRoot) {
      shadowRootRef.current = shadowRoot;
      // 创建一个 portal 容器
      const portalContainer = document.createElement("div");
      portalContainer.id = "floating-portal-root";
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
  }, [isVisible, position, refs]);

  const handleClickOutside = (e: Event) => {
    // 使用 composedPath 来获取事件路径，包括 Shadow DOM
    const path = e.composedPath();
    const target = path[0] as Node;
    const portalElement = portalRef.current;

    // 如果点击目标不在 portal 容器内，则关闭弹窗
    if (portalElement && !portalElement.contains(target)) {
      handleClose();
    }
  };

  useEffect(() => {
    if (!portalRef.current) return;

    const element = portalRef.current;
    element.addEventListener("mousedown", handleClickOutside);

    return () => {
      element.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClose]);

  if (!portalRef.current) return null;

  return (
    <FloatingPortal root={portalRef.current}>
      <AnimatePresence>
        {isVisible && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="fixed z-[999]"
          >
            <motion.div
              className="bg-white rounded-xl select-none inline-flex overflow-hidden"
              style={{
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: 0.1,
                ease: "easeOut",
              }}
            >
              <div className="px-2 py-0.5 flex gap-1.5 items-center bg-white">
                {buttons.map((button, index) => (
                  <IconButton
                    key={index}
                    icon={button.icon}
                    tooltipContent={button.tooltip}
                    onClick={button.action}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
