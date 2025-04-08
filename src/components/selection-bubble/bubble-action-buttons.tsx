import { Languages, Volume2, X } from "lucide-react";
import React from "react";
import { Button } from "../ui/button"; // Adjusted import path

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
    <div className="flex items-center gap-1">
      {/* Translate Button */}
      <Button
        onClick={handleTranslateClick}
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-gray-100" // Adjusted size for consistency
        title="翻译"
      >
        <Languages className="h-3 w-3" />
      </Button>
      {/* Speech Button */}
      <Button
        onClick={handleSpeechClick}
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-gray-100" // Adjusted size for consistency
        title="朗读"
      >
        <Volume2 className="h-3 w-3" />
      </Button>
      {/* Close Button */}
      <Button
        onClick={handleCloseClick}
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-gray-100" // Adjusted size for consistency
        title="关闭"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
