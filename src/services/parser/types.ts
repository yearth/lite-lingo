export type TranslationType = "word_or_phrase" | "sentence";

export interface ParsedSection {
  analysisInfo?: {
    inputType: TranslationType;
    sourceText: string;
  };
  context?: {
    word_translation?: string;
    explanation?: string;
  };
  dictionary?: {
    word: string;
    phonetic: string;
    definitions: Array<{
      definition: string;
      example: string;
    }>;
  };
}

export type ParsedSectionKey = keyof ParsedSection;

// 解析结果类型
export type ParseResult = {
  section?: ParsedSectionKey;
  data?: any;
  done: boolean;
  remainingBuffer: string;
};

// 解析器函数类型
export type Parser = (buffer: string) => ParseResult;
