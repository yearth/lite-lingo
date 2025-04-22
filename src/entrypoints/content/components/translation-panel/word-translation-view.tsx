export const WordTranslationView = ({
  parsedContent,
  shouldShowCursor,
  translatedText,
}: {
  parsedContent: any;
  shouldShowCursor: boolean;
  translatedText: string;
}) => {
  // 如果没有解析内容，使用简单文本模式
  if (!parsedContent.dictionary && translatedText) {
    return (
      <div className="translation-content p-4">
        {/* 翻译结果区域 - 纯文本模式 */}
        <div className="sentence-translation">
          <p className="text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
            {translatedText}
            {shouldShowCursor && <span className="typing-cursor"></span>}
          </p>
        </div>
      </div>
    );
  }

  // 有结构化词典数据的展示
  return (
    <div className="translation-content p-4">
      {/* 翻译结果区域 - 单词布局 */}
      <div className="word-translation">
        {parsedContent.dictionary && (
          <div className="word-info">
            <div className="phonetic text-sm text-gray-500">
              {parsedContent.dictionary.phonetic}
            </div>
            <div className="translation text-base">
              {parsedContent.context?.word_translation}
            </div>
            <div className="definitions mt-2">
              {parsedContent.dictionary.definitions.map(
                (def: any, index: number) => (
                  <div key={index} className="definition-item mt-1">
                    <div className="definition text-sm">{def.definition}</div>
                    <div className="example text-xs text-gray-500">
                      {def.example}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
