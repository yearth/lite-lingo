import { useRef, useState } from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  handleSelector?: string;
}

interface UseDraggableReturn {
  isDragging: boolean;
  dragOffset: Position;
  handleDragStart: (e: Event) => void;
  handleDragMove: (e: Event) => void;
  handleDragEnd: (e: Event) => void;
}

export function useDraggable(
  options: UseDraggableOptions = {}
): UseDraggableReturn {
  const { handleSelector = ".handle" } = options;
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<Position | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const handleDragStart = (e: Event) => {
    const mouseEvent = e as MouseEvent;
    // 只有点击指定的拖拽区域才能拖动
    if (!(mouseEvent.target as HTMLElement).closest(handleSelector)) return;

    setIsDragging(true);
    dragStartPos.current = {
      x: mouseEvent.clientX - dragOffset.x,
      y: mouseEvent.clientY - dragOffset.y,
    };
  };

  const handleDragMove = (e: Event) => {
    if (!isDragging || !dragStartPos.current) return;
    const mouseEvent = e as MouseEvent;

    const deltaX = mouseEvent.clientX - dragStartPos.current.x;
    const deltaY = mouseEvent.clientY - dragStartPos.current.y;

    setDragOffset({
      x: deltaX,
      y: deltaY,
    });
  };

  const handleDragEnd = (e: Event) => {
    setIsDragging(false);
    dragStartPos.current = null;
  };

  return {
    isDragging,
    dragOffset,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
