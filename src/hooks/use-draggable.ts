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
    pointerId: -1, // 保存pointerId以供后续使用
  });

  // 跟踪事件处理函数引用
  const handlersRef = useRef({
    onPointerDown: null as ((e: PointerEvent) => void) | null,
    onPointerMove: null as ((e: PointerEvent) => void) | null,
    onPointerUp: null as ((e: PointerEvent) => void) | null,
    onPointerCancel: null as ((e: PointerEvent) => void) | null,
  });

  // 重置拖拽状态的函数
  const resetDragState = useCallback(() => {
    stateRef.current.isDragging = false;
    stateRef.current.pointerId = -1;
    setIsDragging(false);
  }, []);

  // 清理事件监听器
  const cleanup = useCallback(() => {
    if (handlersRef.current.onPointerMove) {
      document.removeEventListener(
        "pointermove",
        handlersRef.current.onPointerMove as EventListener,
        { capture: true }
      );
    }

    if (handlersRef.current.onPointerUp) {
      document.removeEventListener(
        "pointerup",
        handlersRef.current.onPointerUp as EventListener,
        { capture: true }
      );
      document.removeEventListener(
        "pointercancel",
        handlersRef.current.onPointerCancel as EventListener,
        { capture: true }
      );
    }

    // 尝试释放任何可能仍然活跃的指针捕获
    if (stateRef.current.pointerId !== -1 && ref.current) {
      try {
        ref.current.releasePointerCapture(stateRef.current.pointerId);
      } catch (e) {
        // 忽略可能的错误
      }
    }
  }, [ref]);

  // 使用PointerEvents和PointerCapture实现拖拽
  useEffect(() => {
    // 如果禁用或者引用不存在，直接返回
    if (disabled || !ref.current) return;

    const element = ref.current;

    // 指针按下时的处理函数
    const onPointerDown = (e: PointerEvent) => {
      // 检查是否点击了拖拽手柄
      if (handleSelector) {
        const target = e.target as HTMLElement;
        if (!target.closest(handleSelector)) {
          return;
        }
      }

      // 只处理鼠标或触摸事件
      if (e.pointerType !== "mouse" && e.pointerType !== "touch") {
        return;
      }

      // 阻止默认行为
      e.preventDefault();
      e.stopPropagation();

      // 记录起始位置和偏移量
      const startX = e.clientX;
      const startY = e.clientY;
      const startOffsetX = dragOffset.x;
      const startOffsetY = dragOffset.y;
      const pointerId = e.pointerId;

      // 使用指针捕获 - 关键改进
      if (element.setPointerCapture) {
        try {
          element.setPointerCapture(pointerId);
          console.log("[拖拽] 已捕获指针:", pointerId);
        } catch (err) {
          console.error("[拖拽] 指针捕获失败:", err);
        }
      }

      // 更新状态
      stateRef.current = {
        isDragging: true,
        startPos: { x: startX, y: startY },
        startOffset: { x: startOffsetX, y: startOffsetY },
        currentOffset: { x: startOffsetX, y: startOffsetY },
        pointerId, // 保存pointerId
      };
      setIsDragging(true);

      console.log("[拖拽] 开始", {
        clientX: startX,
        clientY: startY,
        startOffset: { x: startOffsetX, y: startOffsetY },
        pointerId,
      });
    };

    // 指针移动处理
    const onPointerMove = (moveEvent: PointerEvent) => {
      // 确保这是我们正在跟踪的指针
      if (
        !stateRef.current.isDragging ||
        moveEvent.pointerId !== stateRef.current.pointerId
      ) {
        return;
      }

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

      // 限制日志输出频率，减少控制台垃圾信息
      if (Math.random() < 0.05) {
        // 只记录约5%的移动事件
        console.log("[拖拽] 移动", {
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          dx,
          dy,
          newOffset,
        });
      }
    };

    // 指针松开处理
    const onPointerUp = (upEvent: PointerEvent) => {
      // 确保这是我们正在跟踪的指针
      if (
        !stateRef.current.isDragging ||
        upEvent.pointerId !== stateRef.current.pointerId
      ) {
        return;
      }

      upEvent.preventDefault();
      upEvent.stopPropagation();

      // 计算最终位置
      const dx = upEvent.clientX - stateRef.current.startPos.x;
      const dy = upEvent.clientY - stateRef.current.startPos.y;
      const finalOffset = {
        x: stateRef.current.startOffset.x + dx,
        y: stateRef.current.startOffset.y + dy,
      };

      // 如果元素仍然保持指针捕获，释放它
      if (element.releasePointerCapture) {
        try {
          element.releasePointerCapture(stateRef.current.pointerId);
          console.log("[拖拽] 已释放指针:", stateRef.current.pointerId);
        } catch (err) {
          console.error("[拖拽] 指针释放失败:", err);
        }
      }

      // 更新并重置状态
      setDragOffset(finalOffset);
      resetDragState();

      console.log("[拖拽] 结束", {
        finalOffset,
        dx,
        dy,
      });
    };

    // 指针取消处理（例如用户切换应用等情况）
    const onPointerCancel = (cancelEvent: PointerEvent) => {
      // 确保这是我们正在跟踪的指针
      if (
        !stateRef.current.isDragging ||
        cancelEvent.pointerId !== stateRef.current.pointerId
      ) {
        return;
      }

      console.log("[拖拽] 取消", {
        pointerId: cancelEvent.pointerId,
        currentOffset: stateRef.current.currentOffset,
      });

      // 如果元素仍然保持指针捕获，释放它
      if (element.releasePointerCapture) {
        try {
          element.releasePointerCapture(stateRef.current.pointerId);
          console.log("[拖拽] 已释放指针 (取消):", stateRef.current.pointerId);
        } catch (err) {
          console.error("[拖拽] 指针释放失败 (取消):", err);
        }
      }

      // 使用最后一个已知位置
      setDragOffset(stateRef.current.currentOffset);
      resetDragState();
    };

    // 保存引用
    handlersRef.current = {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    };

    // 添加指针按下事件监听
    element.addEventListener("pointerdown", onPointerDown as EventListener);

    // 添加全局指针移动和抬起事件监听
    document.addEventListener("pointermove", onPointerMove as EventListener, {
      capture: true, // 使用捕获阶段以确保不会错过事件
    });
    document.addEventListener("pointerup", onPointerUp as EventListener, {
      capture: true,
    });
    document.addEventListener(
      "pointercancel",
      onPointerCancel as EventListener,
      {
        capture: true,
      }
    );

    // 清理函数
    return () => {
      element.removeEventListener(
        "pointerdown",
        onPointerDown as EventListener
      );
      document.removeEventListener(
        "pointermove",
        onPointerMove as EventListener,
        { capture: true }
      );
      document.removeEventListener("pointerup", onPointerUp as EventListener, {
        capture: true,
      });
      document.removeEventListener(
        "pointercancel",
        onPointerCancel as EventListener,
        { capture: true }
      );

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
