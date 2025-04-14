import { X } from "lucide-react";
import React from "react";

interface ResultHeaderProps {
  onClose: () => void;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({ onClose }) => {
  return (
    <div className="flex justify-between items-center mb-2 translation-result-drag-handle cursor-move">
      <div className="text-xs text-gray-500 font-medium">翻译结果</div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onClose();
        }}
        type="button"
        className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-accent focus:outline-none transition-colors"
        title="关闭"
      >
        <X className="h-3 w-3 text-gray-700" />
      </button>
    </div>
  );
};
