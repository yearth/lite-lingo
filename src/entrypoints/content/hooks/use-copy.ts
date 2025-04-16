import { useCallback } from "react";

export function useCopy() {
  return useCallback(() => {
    const selectedText = window.getSelection()?.toString() || "";
    navigator.clipboard.writeText(selectedText);
    console.log("[ Lite Lingo ] 已复制文本:", selectedText);
  }, []);
}
