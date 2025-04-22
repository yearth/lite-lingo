import React from "react";

export interface PanelIconButtonProps {
  icon: React.ReactNode;
  tooltipContent: string; // 保留参数以保持接口一致
  onClick?: () => void;
  className?: string;
}

/**
 * 专门用于翻译面板内部的图标按钮，不显示tooltip
 */
export function PanelIconButton({
  icon,
  onClick,
  className = "",
}: PanelIconButtonProps) {
  return (
    <button
      className={`p-1 text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer ${className}`}
      onClick={onClick}
      type="button"
      title="操作按钮"
    >
      {icon}
    </button>
  );
}
