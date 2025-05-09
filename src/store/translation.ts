import { ParsedSection } from "@/services/parser/types";
import { create } from "zustand";

// 定义翻译类型枚举
export enum TranslationType {
  LOADING = "loading",
  WORD = "word",
  SENTENCE = "sentence",
}

interface Position {
  x: number;
  y: number;
}

interface TranslationState {
  // 是否显示翻译面板
  isVisible: boolean;
  // 翻译面板的位置
  position: Position | null;
  // 原文内容
  originalText: string;
  // 翻译结果
  translatedText: string;
  // 源语言
  sourceLanguage: string;
  // 目标语言
  targetLanguage: string;
  // 是否正在加载
  isLoading: boolean;
  // 是否固定面板
  isPinned: boolean;
  // 当前活跃的SSE请求ID
  activeRequestId: string | null;
  // 解析后的内容
  parsedContent: Partial<ParsedSection>;
  // 翻译类型：单词还是句子
  translationType: TranslationType;
  // 设置可见性
  setVisibility: (visible: boolean) => void;
  // 设置位置
  setPosition: (position: Position | null) => void;
  // 设置原文
  setOriginalText: (text: string) => void;
  // 设置翻译结果
  setTranslatedText: (text: string) => void;
  // 设置语言
  setLanguages: (source: string, target: string) => void;
  // 设置加载状态
  setLoading: (loading: boolean) => void;
  // 设置固定状态
  setPinned: (pinned: boolean) => void;
  // 切换固定状态
  togglePinned: () => void;
  // 设置活跃的SSE请求ID
  setActiveRequestId: (requestId: string | null) => void;
  // 设置翻译类型
  setTranslationType: (type: TranslationType) => void;
  // 更新解析内容
  updateParsedContent: (section: keyof ParsedSection, data: any) => void;
  // 直接设置整个解析内容对象
  setParsedContent: (content: any) => void;
  // 重置状态
  reset: () => void;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  isVisible: false,
  position: null,
  originalText: "",
  translatedText: "",
  sourceLanguage: "auto",
  targetLanguage: "zh-CN",
  isLoading: false,
  isPinned: false,
  activeRequestId: null,
  parsedContent: {},
  translationType: TranslationType.LOADING,
  setVisibility: (visible) => set({ isVisible: visible }),
  setPosition: (position) => set({ position }),
  setOriginalText: (text) => set({ originalText: text }),
  setTranslatedText: (text) => {
    console.log("设置翻译结果:", text);
    set({ translatedText: text });
  },
  setLanguages: (source, target) =>
    set({ sourceLanguage: source, targetLanguage: target }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPinned: (pinned) => set({ isPinned: pinned }),
  togglePinned: () => set((state) => ({ isPinned: !state.isPinned })),
  setActiveRequestId: (requestId) => set({ activeRequestId: requestId }),
  setTranslationType: (type) => set({ translationType: type }),
  updateParsedContent: (section, data) =>
    set((state) => ({
      parsedContent: {
        ...state.parsedContent,
        [section]: data,
      },
    })),
  setParsedContent: (content) => {
    console.log("设置解析内容:", content);
    set({ parsedContent: content });
  },
  reset: () =>
    set({
      isVisible: false,
      position: null,
      originalText: "",
      translatedText: "",
      isLoading: false,
      isPinned: false,
      activeRequestId: null,
      parsedContent: {},
      translationType: TranslationType.LOADING,
    }),
}));
