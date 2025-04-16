/**
 * API服务工具函数
 */
import { ApiError, ApiResponse } from "./types";

/**
 * 生成唯一请求ID
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 构建包含查询参数的URL
 */
export const buildUrl = (
  url: string,
  params?: Record<string, string>
): string => {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const queryString = Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${queryString}`;
};

/**
 * 响应拦截器类型
 * 接收一个响应，返回一个经过处理的响应或抛出错误
 */
export type ResponseInterceptor = <T>(response: any) => T;

/**
 * 创建标准响应拦截器，处理统一的响应格式
 * 当code !== "0"时，抛出ApiError
 */
export const createStandardResponseInterceptor = (): ResponseInterceptor => {
  return <T>(response: ApiResponse<T>): T => {
    // 检查响应结构是否符合预期
    if (
      response &&
      "code" in response &&
      "message" in response &&
      "data" in response
    ) {
      // 成功响应
      if (response.code === "0") {
        return response.data;
      }
      // 错误响应
      throw new ApiError(response.message, response.code);
    }

    // 不符合预期的响应格式，直接返回
    return response as unknown as T;
  };
};

/**
 * 响应拦截器组合函数
 * 允许将多个拦截器通过管道组合起来
 */
export const composeInterceptors = (
  ...interceptors: ResponseInterceptor[]
): ResponseInterceptor => {
  return <T>(response: any): T => {
    return interceptors.reduce(
      (processedResponse, interceptor) => interceptor(processedResponse),
      response
    );
  };
};

/**
 * 处理响应对象
 */
export const handleResponse = async <T>(
  response: Response,
  interceptor?: ResponseInterceptor
): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
  }

  const contentType = response.headers.get("Content-Type") || "";
  let data: any;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else if (contentType.includes("text/")) {
    data = await response.text();
  } else {
    data = await response.blob();
  }

  // 应用拦截器（如果提供）
  return interceptor ? interceptor<T>(data) : (data as T);
};

/**
 * 通用错误处理函数
 */
export const handleError = (error: any, requestId?: string): never => {
  // 如果是被取消的请求，抛出特殊错误
  if (error?.name === "AbortError") {
    throw {
      type: "REQUEST_CANCELLED",
      message: "请求已取消",
      requestId,
    };
  }

  // 如果是ApiError，直接抛出
  if (error instanceof ApiError) {
    throw error;
  }

  // 其他错误处理逻辑
  throw {
    type: "REQUEST_ERROR",
    message: error.message || "请求失败",
    details: error,
    requestId,
  };
};
