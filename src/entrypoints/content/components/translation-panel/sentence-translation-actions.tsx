import { CopyIcon } from "@/components/icons";
import { PanelIconButton } from "@/components/ui/panel-icon-button";

interface SentenceTranslationActionsProps {
  translatedText: string;
  originalText: string;
  className?: string;
}

export function SentenceTranslationActions({
  translatedText,
  originalText,
  className = "",
}: SentenceTranslationActionsProps) {
  return (
    <div
      className={`p-2 border-t border-gray-100 flex justify-end space-x-1 bg-white ${className}`}
    >
      <PanelIconButton
        icon={<CopyIcon />}
        tooltipContent="复制句子翻译"
        onClick={() => {
          if (translatedText) {
            navigator.clipboard.writeText(translatedText);
          } else if (originalText) {
            navigator.clipboard.writeText(originalText);
          }
        }}
      />
    </div>
  );
}
