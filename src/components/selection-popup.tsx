import { useDraggable } from "@/hooks/use-draggable";
import { useSelectionStore } from "@/store/selection";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useEffect, useRef } from "react";

export function SelectionPopup() {
  const { selectedText, position, isVisible, setVisibility } =
    useSelectionStore();
  const arrowRef = useRef(null);
  const portalRef = useRef<HTMLElement | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  const {
    isDragging,
    dragOffset,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useDraggable();

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    strategy: "fixed",
    middleware: [
      offset(10),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
      arrow({ element: arrowRef }),
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
            x: position.x + dragOffset.x,
            y: position.y + dragOffset.y,
            top: position.y + dragOffset.y,
            right: position.x + dragOffset.x,
            bottom: position.y + dragOffset.y,
            left: position.x + dragOffset.x,
            toJSON() {
              return this;
            },
          };
        },
      });
    }
  }, [isVisible, position, dragOffset]);

  const handleClickOutside = (e: Event) => {
    // 使用 composedPath 来获取事件路径，包括 Shadow DOM
    const path = e.composedPath();
    const target = path[0] as Node;
    const portalElement = portalRef.current;

    // 如果点击目标不在 portal 容器内，则关闭弹窗
    if (portalElement && !portalElement.contains(target)) {
      setVisibility(false);
    }
  };

  useEffect(() => {
    if (!portalRef.current) return;

    const element = portalRef.current;
    element.addEventListener("mousedown", handleClickOutside);
    element.addEventListener("mousedown", handleDragStart);
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);

    return () => {
      element.removeEventListener("mousedown", handleClickOutside);
      element.removeEventListener("mousedown", handleDragStart);
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, []);

  useEffect(() => {
    const shadowRoot = shadowRootRef.current;
    if (!shadowRoot) return;

    const root = shadowRoot as ShadowRoot;
    root.addEventListener("mousedown", handleDragStart);
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);

    return () => {
      root.removeEventListener("mousedown", handleDragStart);
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible || !portalRef.current) return null;

  const style = {
    ...floatingStyles,
    cursor: isDragging ? "grabbing" : "auto",
  };

  return (
    <FloatingPortal root={portalRef.current}>
      <div
        ref={refs.setFloating}
        style={style}
        className="fixed z-[999] bg-white shadow-lg rounded-lg min-w-[200px] select-none"
      >
        {/* 拖拽手柄 */}
        <div className="handle px-2 py-1 bg-gray-100 rounded-t-lg cursor-move border-b text-xs text-gray-500 flex items-center justify-between">
          <span>划词翻译</span>
          <button
            onClick={() => setVisibility(false)}
            className="hover:bg-gray-200 rounded p-1"
          >
            ✕
          </button>
        </div>
        {/* 内容区域 */}
        <div className="p-2">
          <div className="text-sm text-gray-700">{selectedText}</div>
        </div>
        <div ref={arrowRef} className="arrow" />
      </div>
    </FloatingPortal>
  );
}
