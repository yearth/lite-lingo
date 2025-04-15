/**
 * API服务工具函数
 */

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
 * 处理响应对象
 */
export const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
  }

  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  } else if (contentType.includes("text/")) {
    return (await response.text()) as unknown as T;
  } else {
    return (await response.blob()) as unknown as T;
  }
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

  // 其他错误处理逻辑
  throw {
    type: "REQUEST_ERROR",
    message: error.message || "请求失败",
    details: error,
    requestId,
  };
};
