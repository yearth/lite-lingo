import { createErrorHandler } from "./error-handlers";
import { handleSSEStream, StreamContext } from "./sse-handler";

/**
 * 请求选项接口
 */
export interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * 处理流请求
 */
export const handleStreamRequest = async (
  options: RequestOptions,
  context: StreamContext
) => {
  const { requestId, tabId, messageHandler } = context;
  const errorHandler = createErrorHandler(requestId, tabId, messageHandler);

  try {
    // 记录请求开始
    console.log(`[请求开始][${requestId}] ${options.url}`);

    // 创建请求
    const response = await fetch(options.url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }

    // 检查响应是否为流
    if (!response.body) {
      throw new Error("响应没有可读流");
    }

    // 获取流读取器
    const reader = response.body.getReader();

    // 处理SSE流
    await handleSSEStream(reader, context);
  } catch (error) {
    errorHandler(error);
  }
};
