import { useSelectionStore } from "@/store/selection";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  arrow,
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";

function DraggableContent({ children }: { children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: "selection-popup",
  });

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        touchAction: "none",
      }
    : { touchAction: "none" };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

export function SelectionPopup() {
  const { selectedText, position, isVisible, setVisibility } =
    useSelectionStore();
  const arrowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);

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
      // 创建一个 portal 容器
      const portalContainer = document.createElement("div");
      portalContainer.id = "floating-portal-root";
      shadowRoot.appendChild(portalContainer);
      portalRef.current = portalContainer;

      return () => {
        shadowRoot.removeChild(portalContainer);
        portalRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (isVisible && position && !isDragging) {
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
  }, [isVisible, position, isDragging]);

  const handleClickOutside = (e: MouseEvent) => {
    if (!refs.floating.current?.contains(e.target as Node)) {
      setVisibility(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (!isVisible || !portalRef.current) return null;

  return (
    <FloatingPortal root={portalRef.current}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DraggableContent>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
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
        </DraggableContent>
      </DndContext>
    </FloatingPortal>
  );
}
