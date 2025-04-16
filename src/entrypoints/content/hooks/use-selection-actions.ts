import { useClosePopup } from "./use-close-popup";
import { useCopy } from "./use-copy";
import { useExplain } from "./use-explain";
import { useSpeak } from "./use-speak";
import { useTranslate } from "./use-translate";

export function useSelectionActions() {
  const handleTranslate = useTranslate();
  const handleCopy = useCopy();
  const handleExplain = useExplain();
  const handleSpeak = useSpeak();
  const handleClose = useClosePopup();

  return {
    handleTranslate,
    handleCopy,
    handleExplain,
    handleSpeak,
    handleClose,
  };
}
