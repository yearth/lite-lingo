import { TranslationType } from "@/store/translation";
import { SentenceTranslationActions } from "./sentence-translation-actions";
import { WordTranslationActions } from "./word-translation-actions";

/**
 * 统一的操作区域组件，根据翻译类型选择显示对应的操作按钮
 */
export function TranslationActions({
  translatedText,
  originalText,
  parsedContent,
  translationType,
  className = "",
}: {
  translatedText: string;
  originalText: string;
  parsedContent: any;
  translationType: TranslationType;
  className?: string;
}) {
  // 根据翻译类型渲染不同的Actions组件
  return (
    <div className={`${className}`}>
      {translationType === TranslationType.SENTENCE ? (
        <SentenceTranslationActions
          translatedText={translatedText}
          originalText={originalText}
        />
      ) : translationType === TranslationType.WORD ? (
        <WordTranslationActions
          translatedText={translatedText}
          parsedContent={parsedContent}
        />
      ) : null}
    </div>
  );
}
