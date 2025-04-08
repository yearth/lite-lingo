import { Copy, Volume2 } from "lucide-react";
import React from "react";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { Button } from "../ui/button";

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

  return (
    <div className="flex justify-end space-x-1 mt-2">
      <Button
        onClick={handleSpeechClick}
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-gray-100"
        title="朗读译文"
        disabled={isSpeechDisabled}
      >
        <Volume2 className="h-3 w-3" />
      </Button>
      <Button
        onClick={handleCopyClick}
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full hover:bg-gray-100"
        title={copied ? "已复制" : "复制译文"}
        disabled={isCopyDisabled}
      >
        <Copy className="h-3 w-3" />
        {copied && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 h-2 w-2 bg-green-500 rounded-full"></span>
        )}
      </Button>
    </div>
  );
};
