/**
 * JSON 流处理状态类型定义
 */

// JSON 解析器预处理状态
export type PreprocessState = {
  readonly isInString: boolean;
  readonly previousChar: string | null;
};

// 请求处理状态
export type RequestState = {
  readonly parseState: any;
  readonly chunkCount: number;
  readonly jsonBuffer: string;
  readonly preprocessState: PreprocessState;
};

// 创建初始状态
export const createInitialState = (): RequestState => ({
  parseState: {},
  chunkCount: 0,
  jsonBuffer: "",
  preprocessState: {
    isInString: false,
    previousChar: null,
  },
});
