import { Copy, Volume2 } from "lucide-react";
import React from "react";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";

interface ActionButtonsProps {
  textToCopy: string;
  onSpeech: () => void;
  isSpeechDisabled?: boolean;
  isCopyDisabled?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  textToCopy,
  onSpeech,
  isSpeechDisabled = false,
  isCopyDisabled = false,
}) => {
  const { copy, copied } = useCopyToClipboard();

  const handleCopyClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    copy(textToCopy);
  };

  const handleSpeechClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    onSpeech();
  };

  const buttonClass =
    "h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent focus:outline-none transition-colors disabled:opacity-50";
  const iconClass = "h-3 w-3";

  return (
    <div className="flex justify-end space-x-1 mt-2">
      <button
        onClick={handleSpeechClick}
        type="button"
        className={buttonClass}
        title="朗读译文"
        disabled={isSpeechDisabled}
      >
        <Volume2 className={iconClass} />
      </button>
      <button
        onClick={handleCopyClick}
        type="button"
        className={buttonClass}
        title={copied ? "已复制" : "复制译文"}
        disabled={isCopyDisabled}
      >
        <Copy className={iconClass} />
        {copied && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 h-2 w-2 bg-green-500 rounded-full"></span>
        )}
      </button>
    </div>
  );
};
