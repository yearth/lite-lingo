import { X } from "lucide-react";
import React from "react";
import { Button } from "../ui/button"; // Assuming Button is in ../ui/button

interface ResultHeaderProps {
  onClose: () => void;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({ onClose }) => {
  return (
    <div className="flex justify-between items-center mb-2 translation-result-drag-handle cursor-move">
      {" "}
      {/* Added handle class and cursor */}
      <div className="text-xs text-gray-500 font-medium">
        {" "}
        {/* Removed dark text color */}
        翻译结果
      </div>{" "}
      <Button
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }}
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full hover:bg-gray-100" // Removed dark hover
        title="关闭"
      >
        <X className="h-3 w-3 text-gray-700" /> {/* Removed dark text color */}
      </Button>
    </div>
  );
};
