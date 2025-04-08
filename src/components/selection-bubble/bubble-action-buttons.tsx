import { BookHeadphones, Languages, Volume2, X } from "lucide-react"; // Removed Info, kept BookHeadphones
import React, { useCallback } from "react"; // Re-import useCallback
import { Button } from "../ui/button";

interface BubbleActionButtonsProps {
  onTranslate: () => void;
  onSpeech: () => void;
  onClose: () => void;
}

export const BubbleActionButtons: React.FC<BubbleActionButtonsProps> = ({
  onTranslate,
  onSpeech,
  onClose,
}) => {
  const handleTranslateClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    console.log("[Lite Lingo] 翻译按钮被点击 (in BubbleActionButtons)");
    onTranslate();
  };

  const handleSpeechClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    console.log("[Lite Lingo] 朗读按钮被点击 (in BubbleActionButtons)");
    onSpeech();
  };

  const handleCloseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    console.log("[Lite Lingo] 关闭按钮被点击 (in BubbleActionButtons)");
    onClose();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        /* Removed size="icon" */
        className="rounded-md bubble-button h-5 w-5" // Changed to h-5 w-5, removed p-1
        title="logo"
        onMouseEnter={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.add("bubble-button-hover"),
          []
        )}
        onMouseLeave={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.remove("bubble-button-hover"),
          []
        )}
      >
        <BookHeadphones color="#374151" className="h-3 w-3" />
      </Button>

      <Button
        onClick={handleTranslateClick}
        variant="ghost"
        /* Removed size="icon" */
        className="rounded-md bubble-button h-5 w-5" // Changed to h-5 w-5, removed p-1
        title="翻译"
        onMouseEnter={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.add("bubble-button-hover"),
          []
        )}
        onMouseLeave={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.remove("bubble-button-hover"),
          []
        )}
      >
        <Languages color="#374151" className="h-3 w-3" />{" "}
        {/* Changed to h-2 w-2 */}
      </Button>
      <Button
        onClick={handleSpeechClick}
        variant="ghost" // Restored variant
        /* Removed size="icon" */
        className="rounded-md bubble-button h-5 w-5" // Changed to h-5 w-5, removed p-1
        title="朗读"
        onMouseEnter={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.add("bubble-button-hover"),
          []
        )}
        onMouseLeave={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.remove("bubble-button-hover"),
          []
        )}
      >
        <Volume2 color="#374151" className="h-3 w-3" />{" "}
        {/* Changed to h-2 w-2 */}
      </Button>
      <Button
        onClick={handleCloseClick}
        variant="ghost" // Restored variant
        /* Removed size="icon" */
        className="rounded-md bubble-button h-5 w-5" // Changed to h-5 w-5, removed p-1
        title="关闭"
        onMouseEnter={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.add("bubble-button-hover"),
          []
        )}
        onMouseLeave={useCallback(
          (e: React.MouseEvent<HTMLButtonElement>) =>
            e.currentTarget.classList.remove("bubble-button-hover"),
          []
        )}
      >
        <X color="#374151" className="h-3 w-3" /> {/* Changed to h-2 w-2 */}
      </Button>
    </div>
  );
};
