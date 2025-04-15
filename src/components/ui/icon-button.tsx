import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React from "react";

export interface IconButtonProps {
  icon: React.ReactNode;
  tooltipContent: string;
  onClick?: () => void;
  className?: string;
}

export function IconButton({
  icon,
  tooltipContent,
  onClick,
  className = "",
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`p-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer ${className}`}
          onClick={onClick}
          type="button"
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
  );
}
