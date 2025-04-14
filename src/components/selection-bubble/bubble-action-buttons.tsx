import { BookHeadphones, Languages, Volume2, X } from "lucide-react"; // Removed Info, kept BookHeadphones
import React, { useCallback } from "react"; // Re-import useCallback

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

  // 创建一个通用按钮样式类 - 使用已定义的颜色类
  const buttonClass =
    "h-5 w-5 rounded-md flex items-center justify-center hover:bg-accent focus:outline-none transition-colors";
  const iconClass = "h-3 w-3 text-gray-700";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={buttonClass}
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
        <BookHeadphones className={iconClass} />
      </button>

      <button
        type="button"
        onClick={handleTranslateClick}
        className={buttonClass}
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
        <Languages className={iconClass} />
      </button>

      <button
        type="button"
        onClick={handleSpeechClick}
        className={buttonClass}
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
        <Volume2 className={iconClass} />
      </button>

      <button
        type="button"
        onClick={handleCloseClick}
        className={buttonClass}
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
        <X className={iconClass} />
      </button>
    </div>
  );
};
