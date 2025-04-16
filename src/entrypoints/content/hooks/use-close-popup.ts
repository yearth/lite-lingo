import { useSelectionStore } from "@/store/selection";
import { useCallback } from "react";

export function useClosePopup() {
  const { setVisibility } = useSelectionStore();

  return useCallback(() => {
    setVisibility(false);
  }, [setVisibility]);
}
