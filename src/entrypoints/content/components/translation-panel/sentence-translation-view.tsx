// 句子翻译组件
export const SentenceTranslationView = ({
  translatedText,
  shouldShowCursor,
}: {
  translatedText: string;
  shouldShowCursor: boolean;
}) => {
  return (
    <div className="translation-content p-4">
      {/* 翻译结果 */}
      <div className="sentence-translation">
        <p className="text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
          {translatedText}
          {shouldShowCursor && <span className="typing-cursor"></span>}
        </p>
      </div>
    </div>
  );
};
