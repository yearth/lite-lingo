/**
 * JSON 流处理状态存储容器
 */
import { RequestState, createInitialState } from "./types";

// 存储所有请求的状态
const stateStore = new Map<string, RequestState>();

/**
 * 获取请求状态
 * @param requestId 请求ID
 * @returns 请求状态
 */
export const getState = (requestId: string): RequestState =>
  stateStore.get(requestId) || createInitialState();

/**
 * 更新请求状态
 * @param requestId 请求ID
 * @param updater 更新函数
 */
export const updateState = (
  requestId: string,
  updater: (state: RequestState) => RequestState
): void => {
  const currentState = getState(requestId);
  const newState = updater(currentState);
  stateStore.set(requestId, newState);
};

/**
 * 清理请求状态
 * @param requestId 请求ID
 */
export const clearState = (requestId: string): void => {
  stateStore.delete(requestId);
};
