import { CopyIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";

interface WordTranslationActionsProps {
  translatedText: string;
  parsedContent: any;
  className?: string;
}

export function WordTranslationActions({
  translatedText,
  parsedContent,
  className = "",
}: WordTranslationActionsProps) {
  return (
    <div
      className={`p-2 border-t border-gray-100 flex justify-end space-x-1 bg-white ${className}`}
    >
      <IconButton
        icon={<CopyIcon />}
        tooltipContent="复制单词翻译"
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
    </div>
  );
}
