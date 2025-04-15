import { RefObject, useCallback, useEffect, useRef, useState } from "react";

interface UseDraggableOptions {
  handleSelector?: string;
  disabled?: boolean;
  inShadowDOM?: boolean;
}

export function useDraggable<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseDraggableOptions = {}
) {
  const { handleSelector, disabled = false, inShadowDOM = false } = options;

  // 保存拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 手动跟踪状态，确保最新值
  const stateRef = useRef({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
    currentOffset: { x: 0, y: 0 },
  });

  // 跟踪事件处理函数引用
  const handlersRef = useRef({
    onMouseDown: null as ((e: MouseEvent) => void) | null,
    onMouseMove: null as ((e: MouseEvent) => void) | null,
    onMouseUp: null as ((e: MouseEvent) => void) | null,
  });

  // 重置拖拽状态的函数
  const resetDragState = useCallback(() => {
    stateRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

  // 清理事件监听器
  const cleanup = useCallback(() => {
    if (handlersRef.current.onMouseMove) {
      window.removeEventListener(
        "mousemove",
        handlersRef.current.onMouseMove as EventListener
      );
      document.removeEventListener(
        "mousemove",
        handlersRef.current.onMouseMove as EventListener
      );
    }

    if (handlersRef.current.onMouseUp) {
      window.removeEventListener(
        "mouseup",
        handlersRef.current.onMouseUp as EventListener
      );
      document.removeEventListener(
        "mouseup",
        handlersRef.current.onMouseUp as EventListener
      );
    }
  }, []);

  // 简化的拖拽实现，直接基于mousemove事件
  useEffect(() => {
    // 如果禁用或者引用不存在，直接返回
    if (disabled || !ref.current) return;

    const element = ref.current;

    // 鼠标按下时的处理函数
    const onMouseDown = (e: MouseEvent) => {
      // 检查是否点击了拖拽手柄
      if (handleSelector) {
        const target = e.target as HTMLElement;
        if (!target.closest(handleSelector)) {
          return;
        }
      }

      // 阻止默认行为
      e.preventDefault();
      e.stopPropagation();

      // 记录起始位置和偏移量
      const startX = e.clientX;
      const startY = e.clientY;
      const startOffsetX = dragOffset.x;
      const startOffsetY = dragOffset.y;

      // 更新状态
      stateRef.current = {
        isDragging: true,
        startPos: { x: startX, y: startY },
        startOffset: { x: startOffsetX, y: startOffsetY },
        currentOffset: { x: startOffsetX, y: startOffsetY },
      };
      setIsDragging(true);

      console.log("[拖拽] 开始", {
        clientX: startX,
        clientY: startY,
        startOffset: { x: startOffsetX, y: startOffsetY },
      });

      // 鼠标移动处理
      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!stateRef.current.isDragging) return;

        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        // 计算偏移量
        const dx = moveEvent.clientX - stateRef.current.startPos.x;
        const dy = moveEvent.clientY - stateRef.current.startPos.y;

        // 计算新位置
        const newOffset = {
          x: stateRef.current.startOffset.x + dx,
          y: stateRef.current.startOffset.y + dy,
        };

        // 更新状态
        stateRef.current.currentOffset = newOffset;
        setDragOffset(newOffset);

        console.log("[拖拽] 移动", {
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          dx,
          dy,
          newOffset,
        });
      };

      // 鼠标松开处理
      const onMouseUp = (upEvent: MouseEvent) => {
        if (!stateRef.current.isDragging) return;

        upEvent.preventDefault();
        upEvent.stopPropagation();

        // 计算最终位置
        const dx = upEvent.clientX - stateRef.current.startPos.x;
        const dy = upEvent.clientY - stateRef.current.startPos.y;
        const finalOffset = {
          x: stateRef.current.startOffset.x + dx,
          y: stateRef.current.startOffset.y + dy,
        };

        // 更新并重置状态
        setDragOffset(finalOffset);
        resetDragState();

        console.log("[拖拽] 结束", {
          finalOffset,
          dx,
          dy,
        });

        // 移除临时事件监听
        document.removeEventListener("mousemove", onMouseMove as EventListener);
        document.removeEventListener("mouseup", onMouseUp as EventListener);
        window.removeEventListener("mousemove", onMouseMove as EventListener);
        window.removeEventListener("mouseup", onMouseUp as EventListener);
      };

      // 保存引用
      handlersRef.current = {
        onMouseDown,
        onMouseMove,
        onMouseUp,
      };

      // 添加临时事件监听
      document.addEventListener("mousemove", onMouseMove as EventListener);
      document.addEventListener("mouseup", onMouseUp as EventListener);
      window.addEventListener("mousemove", onMouseMove as EventListener);
      window.addEventListener("mouseup", onMouseUp as EventListener);

      // 处理Shadow DOM
      if (inShadowDOM) {
        try {
          let node: Node | null = element;
          while (node) {
            if (node instanceof ShadowRoot) {
              const host = node.host;
              const hostDoc = host.ownerDocument;

              hostDoc.addEventListener(
                "mousemove",
                onMouseMove as EventListener
              );
              hostDoc.addEventListener("mouseup", onMouseUp as EventListener);
              host.addEventListener("mousemove", onMouseMove as EventListener);
              host.addEventListener("mouseup", onMouseUp as EventListener);
              break;
            }
            node = node.parentNode;
          }
        } catch (err) {
          console.error("[拖拽] Shadow DOM 事件绑定失败:", err);
        }
      }
    };

    // 添加鼠标按下事件监听
    element.addEventListener("mousedown", onMouseDown as EventListener);

    // 清理函数
    return () => {
      element.removeEventListener("mousedown", onMouseDown as EventListener);
      cleanup();
    };
  }, [
    ref,
    handleSelector,
    disabled,
    dragOffset,
    resetDragState,
    cleanup,
    inShadowDOM,
  ]);

  return {
    isDragging,
    dragOffset,
    setDragOffset,
    resetDragOffset: useCallback(() => {
      setDragOffset({ x: 0, y: 0 });
      stateRef.current.currentOffset = { x: 0, y: 0 };
    }, []),
  };
}
