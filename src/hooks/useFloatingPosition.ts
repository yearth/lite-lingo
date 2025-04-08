import { computePosition, offset, shift } from "@floating-ui/dom";
import { RefObject, useEffect, useState } from "react";

interface Position {
  x: number;
  y: number;
}

/**
 * Custom hook to calculate the position of a floating element relative to a target point.
 * @param targetPosition The virtual target position (e.g., mouse coordinates).
 * @param elementRef Ref to the floating element whose position needs to be calculated.
 * @param isVisible Whether the floating element should be visible (triggers calculation).
 * @returns The calculated position { x, y } for the floating element.
 */
export function useFloatingPosition(
  targetPosition: Position,
  elementRef: RefObject<HTMLElement | null>, // Allow null in the RefObject type
  isVisible: boolean
): Position {
  const [resultPosition, setResultPosition] = useState<Position>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!isVisible || !elementRef.current) {
      // Reset position or keep last known? Resetting might be safer.
      // setResultPosition({ x: 0, y: 0 }); // Optional: Reset if not visible
      return;
    }

    const virtualElement = {
      getBoundingClientRect() {
        return {
          width: 0,
          height: 0,
          x: targetPosition.x,
          y: targetPosition.y,
          top: targetPosition.y,
          left: targetPosition.x,
          right: targetPosition.x,
          bottom: targetPosition.y,
        };
      },
    };

    computePosition(virtualElement as Element, elementRef.current, {
      placement: "bottom", // Or make this configurable?
      strategy: "fixed",
      middleware: [offset(8), shift({ padding: 10 })], // Padding to keep within viewport
    }).then(({ x, y }) => {
      setResultPosition({ x, y });
    });

    // Dependencies: Recalculate if visibility, target position, or the element itself changes.
  }, [isVisible, targetPosition.x, targetPosition.y, elementRef]);

  return resultPosition;
}
