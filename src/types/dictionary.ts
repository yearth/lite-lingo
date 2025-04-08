export interface DictionaryExample {
  original: string;
  translation: string;
}

export interface DictionaryDefinition {
  pos: string; // Part of speech
  def: string; // Definition text
  examples: DictionaryExample[];
}

export interface DictionaryData {
  word: string;
  translation: string;
  phonetic?: string;
  definitions: DictionaryDefinition[];
}
