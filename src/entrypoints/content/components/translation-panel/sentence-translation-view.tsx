export // 句子翻译组件
const SentenceTranslationView = ({
  originalText,
  translatedText,
  shouldShowCursor,
}: {
  originalText: string;
  translatedText: string;
  shouldShowCursor: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="translation-content space-y-4 p-4">
      {/* 可折叠原文区域 */}
      <div className="original-text-container">
        <p
          className={`text-sm text-gray-700 select-text whitespace-pre-wrap break-words ${
            isExpanded ? "" : "line-clamp-1"
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {originalText}
        </p>
        {originalText.length > 50 && (
          <button
            className="text-xs text-blue-500 mt-1 hover:underline"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "收起" : "展开"}
          </button>
        )}
      </div>

      {/* 翻译结果 */}
      <div className="sentence-translation mt-2">
        <p className="text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
          {translatedText}
          {shouldShowCursor && <span className="typing-cursor"></span>}
        </p>
      </div>
    </div>
  );
};
