import { useCallback } from "react";

export function useExplain() {
  return useCallback(() => {
    const selectedText = window.getSelection()?.toString() || "";
    console.log("[ Lite Lingo ] 解释功能 - 待实现:", selectedText);
    // 这里实现解释功能的逻辑
  }, []);
}
