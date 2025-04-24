/**
 * JSON 流处理状态更新函数
 */
import { PreprocessState, RequestState } from "./types";

/**
 * 增加处理块计数
 */
export const incrementChunkCount = (state: RequestState): RequestState => ({
  ...state,
  chunkCount: state.chunkCount + 1,
});

/**
 * 添加JSON内容到缓冲区
 */
export const appendJsonBuffer = (
  state: RequestState,
  content: string
): RequestState => ({
  ...state,
  jsonBuffer: state.jsonBuffer + content,
});

/**
 * 更新解析状态
 */
export const updateParseState = (
  state: RequestState,
  newParseState: any
): RequestState => ({
  ...state,
  parseState: { ...newParseState },
});

/**
 * 更新预处理状态
 */
export const updatePreprocessState = (
  state: RequestState,
  preprocessState: PreprocessState
): RequestState => ({
  ...state,
  preprocessState,
});

/**
 * 重置状态
 */
export const resetState = (): RequestState => ({
  parseState: {},
  chunkCount: 0,
  jsonBuffer: "",
  preprocessState: {
    isInString: false,
    previousChar: null,
  },
});
