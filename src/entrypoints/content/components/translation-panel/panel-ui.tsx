import { CloseIcon, CopyIcon, PinIcon, SpeakIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { TranslationType } from "@/store/translation";
import { motion } from "framer-motion";
import { ReactNode, forwardRef, useState } from "react";

// 面板容器组件
interface PanelContainerProps {
  children: ReactNode;
  isDragging: boolean;
  width?: string;
  className?: string;
}

export const PanelContainer = forwardRef<HTMLDivElement, PanelContainerProps>(
  ({ children, isDragging, width = "360px", className = "" }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`bg-white rounded-lg shadow-lg select-none flex flex-col overflow-hidden will-change-transform text-gray-800 ${className}`}
        style={{
          width,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          cursor: isDragging ? "grabbing" : "default",
          position: "relative",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{
          duration: 0.1,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    );
  }
);

PanelContainer.displayName = "PanelContainer";

// 面板拖动手柄组件
interface PanelHandleProps {
  title?: string;
}

export function PanelHandle({ title = "拖动移动面板" }: PanelHandleProps) {
  return (
    <div
      className="panel-handle absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab z-10"
      style={{
        backgroundColor: "transparent",
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
      }}
      title={title}
    >
      <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
    </div>
  );
}

// 面板工具栏组件
interface PanelToolbarProps {
  isPinned: boolean;
  togglePinned: () => void;
  onClose: () => void;
  className?: string;
}

export function PanelToolbar({
  isPinned,
  togglePinned,
  onClose,
  className = "",
}: PanelToolbarProps) {
  return (
    <div className={`absolute top-2 right-2 flex space-x-1 z-20 ${className}`}>
      <IconButton
        icon={<PinIcon filled={!!isPinned} />}
        tooltipContent={isPinned ? "取消固定" : "固定面板"}
        onClick={togglePinned}
      />
      <IconButton
        icon={<CloseIcon />}
        tooltipContent="关闭"
        onClick={onClose}
      />
    </div>
  );
}

// 面板头部组件
interface PanelHeaderProps {
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translationType: TranslationType;
  className?: string;
}

export function PanelHeader({
  sourceLanguage,
  targetLanguage,
  originalText,
  translationType,
  className = "",
}: PanelHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSentence = translationType === TranslationType.SENTENCE;
  const needTruncate = isSentence && originalText.length > 60;

  // 复制原文
  const handleCopyOriginal = () => {
    if (originalText) {
      navigator.clipboard.writeText(originalText);
    }
  };

  return (
    <div className={`p-3 pt-6 border-b border-gray-100 bg-white ${className}`}>
      {/* 上部：翻译标题和语言方向 */}
      <div className="flex items-center justify-start mb-2">
        <h3 className="text-sm font-medium text-gray-800">翻译</h3>
        <div className="text-xs text-gray-500 flex items-center ml-2">
          <span>{sourceLanguage === "auto" ? "自动检测" : sourceLanguage}</span>
          <span className="mx-1">→</span>
          <span>{targetLanguage}</span>
        </div>
      </div>

      {/* 下部：原文展示区域 */}
      {originalText && (
        <div className="mt-2 bg-gray-50 p-2 rounded-md relative group">
          <p
            className={`text-base font-medium ${
              needTruncate && !isExpanded ? "line-clamp-2" : ""
            }`}
            onClick={() => needTruncate && setIsExpanded(!isExpanded)}
          >
            {originalText}
          </p>

          {/* 展开/收起按钮 */}
          {needTruncate && (
            <button
              className="text-xs text-blue-500 mt-1 hover:underline"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "收起" : "展开"}
            </button>
          )}

          {/* 复制按钮 */}
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconButton
              icon={<CopyIcon />}
              tooltipContent="复制原文"
              onClick={handleCopyOriginal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// 面板操作栏组件
interface PanelActionsProps {
  translatedText: string;
  parsedContent: any;
  className?: string;
}

export function PanelActions({
  translatedText,
  parsedContent,
  className = "",
}: PanelActionsProps) {
  return (
    <div
      className={`p-2 border-t border-gray-100 flex justify-end space-x-1 bg-white ${className}`}
    >
      <IconButton
        icon={<CopyIcon />}
        tooltipContent="复制翻译结果"
        onClick={() => {
          if (translatedText) {
            navigator.clipboard.writeText(translatedText);
          } else if (parsedContent.analysisInfo?.sourceText) {
            navigator.clipboard.writeText(
              parsedContent.analysisInfo.sourceText
            );
          }
        }}
      />
      <IconButton
        icon={<SpeakIcon />}
        tooltipContent="朗读翻译结果"
        onClick={() => {
          console.log("朗读翻译结果");
        }}
      />
    </div>
  );
}
