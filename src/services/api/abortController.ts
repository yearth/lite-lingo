/**
 * 请求取消管理模块
 */
import { ResponseInterceptor, generateRequestId } from "./utils";

// 存储活跃请求的Map
const activeRequests = new Map<string, AbortController>();

// 请求配置接口
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  requestId?: string;
  responseInterceptor?: ResponseInterceptor; // 响应拦截器
  [key: string]: any;
}

// 超时处理器Map
const timeoutHandlers = new Map<string, NodeJS.Timeout>();

/**
 * 准备请求配置，创建AbortController
 */
export const prepareRequest = (config: RequestConfig = {}) => {
  const requestId = config.requestId || generateRequestId();
  const controller = new AbortController();

  // 如果已提供signal，则与新controller链接
  if (config.signal) {
    config.signal.addEventListener("abort", () => controller.abort());
  }

  activeRequests.set(requestId, controller);

  // 设置超时处理
  if (config.timeout && config.timeout > 0) {
    const timeoutId = setTimeout(() => {
      cancelRequest(requestId, "TIMEOUT");
    }, config.timeout);

    timeoutHandlers.set(requestId, timeoutId);

    // 当请求完成或被取消，清除超时处理器
    controller.signal.addEventListener("abort", () => {
      const timeoutId = timeoutHandlers.get(requestId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutHandlers.delete(requestId);
      }
    });
  }

  return {
    signal: controller.signal,
    requestId,
  };
};

/**
 * 取消指定ID的请求
 */
export const cancelRequest = (
  requestId: string,
  reason: string = "CANCELLED"
) => {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort(reason);
    activeRequests.delete(requestId);

    // 清理相关的超时处理器
    const timeoutId = timeoutHandlers.get(requestId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutHandlers.delete(requestId);
    }

    return true;
  }
  return false;
};

/**
 * 取消所有活跃请求
 */
export const cancelAllRequests = (reason: string = "CANCELLED_ALL") => {
  const requestIds = Array.from(activeRequests.keys());

  requestIds.forEach((requestId) => {
    cancelRequest(requestId, reason);
  });

  return requestIds.length;
};
