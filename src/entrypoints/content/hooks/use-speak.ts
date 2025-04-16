import { useCallback } from "react";

export function useSpeak() {
  return useCallback(() => {
    const selectedText = window.getSelection()?.toString() || "";
    console.log("[ Lite Lingo ] 朗读文本:", selectedText);
    // 这里实现文本朗读功能
    // 例如使用Web Speech API:
    // const speech = new SpeechSynthesisUtterance(selectedText);
    // window.speechSynthesis.speak(speech);
  }, []);
}
