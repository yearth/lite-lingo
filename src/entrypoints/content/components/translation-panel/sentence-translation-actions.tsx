import { CopyIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

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
      <IconButton
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
