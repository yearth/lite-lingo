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
  if (
    (!parsedContent || Object.keys(parsedContent).length === 0) &&
    translatedText
  ) {
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
    <div className="translation-content">
      {/* 红色区域：简要翻译和解释 */}
      <div className="context-area p-4">
        <div className="word-translation text-lg font-medium">
          {parsedContent.context?.word_translation || ""}
          {shouldShowCursor && !parsedContent.context?.word_translation && (
            <span className="typing-cursor"></span>
          )}
        </div>
        <div className="explanation text-sm text-gray-600 mt-1">
          {parsedContent.context?.explanation || ""}
          {shouldShowCursor &&
            parsedContent.context?.word_translation &&
            !parsedContent.context?.explanation && (
              <span className="typing-cursor"></span>
            )}
        </div>
      </div>

      {/* 蓝色区域：词典详情 - 仅在有dictionary数据时显示 */}
      {parsedContent.dictionary && (
        <div className="dictionary-area p-4 bg-blue-50 rounded-b-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="word text-sm font-medium">
              {parsedContent.dictionary?.word || ""}
            </div>
            <div className="phonetic text-sm text-gray-500">
              {parsedContent.dictionary?.phonetic || ""}
            </div>
            {shouldShowCursor &&
              parsedContent.dictionary?.word &&
              !parsedContent.dictionary?.definitions && (
                <span className="typing-cursor"></span>
              )}
          </div>

          {parsedContent.dictionary?.definitions &&
            parsedContent.dictionary.definitions.length > 0 && (
              <div className="definitions">
                {parsedContent.dictionary.definitions.map(
                  (def: any, index: number) => (
                    <div key={index} className="definition-item mt-2">
                      <div className="flex gap-2">
                        <span className="pos text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                          {def.pos}
                        </span>
                        <span className="def text-sm">{def.def}</span>
                      </div>
                      {def.example && (
                        <div className="example mt-1 ml-2 border-l-2 border-gray-300 pl-2">
                          <div className="orig text-xs text-gray-600">
                            {def.example.orig}
                          </div>
                          <div className="trans text-xs text-gray-500">
                            {def.example.trans}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
                {shouldShowCursor && <span className="typing-cursor"></span>}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
