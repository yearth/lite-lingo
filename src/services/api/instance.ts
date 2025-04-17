/**
 * API客户端实例
 * 提供全局单例API客户端
 */
import { createApiClient } from "./index";
import { SSEConfig } from "./sse";
import { createStandardResponseInterceptor } from "./utils";

// 创建标准响应拦截器
const standardInterceptor = createStandardResponseInterceptor();

// 创建全局API客户端实例
export const api = createApiClient({
  baseUrl: "http://127.0.0.1:3000",
  defaultHeaders: {
    Accept: "application/json", // 移除Content-Type头，将由createRequestConfig根据请求方法决定是否添加
  },
  defaultTimeout: 30000, // 30秒超时
  responseInterceptor: standardInterceptor, // 使用标准响应拦截器
});

// 导出常用方法便于直接使用
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.delete;
export const patch = api.patch;
export const sse = api.sse;
export const cancelRequest = api.cancelRequest;

/**
 * 通过background脚本发送GET请求的方法（解决CORS问题）
 */
export async function backgroundGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  // 构建完整URL
  const url = `http://127.0.0.1:3000${path}${
    params ? "?" + new URLSearchParams(params).toString() : ""
  }`;

  // 发送消息到background脚本处理请求
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        url,
        method: "GET",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        try {
          // 使用拦截器处理响应
          if (response.success) {
            resolve(standardInterceptor<T>(response.data));
          } else {
            reject(new Error(response.error || "请求失败"));
          }
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * 通过background脚本发送POST请求的方法（解决CORS问题）
 */
export async function backgroundPost<T>(
  path: string,
  data?: any,
  params?: Record<string, string>
): Promise<T> {
  // 构建完整URL
  const url = `http://127.0.0.1:3000${path}${
    params ? "?" + new URLSearchParams(params).toString() : ""
  }`;

  // 发送消息到background脚本处理请求
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        url,
        method: "POST",
        data: data,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        try {
          // 使用拦截器处理响应
          if (response.success) {
            resolve(standardInterceptor<T>(response.data));
          } else {
            reject(new Error(response.error || "请求失败"));
          }
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

/**
 * 通过background脚本发送SSE流式请求的方法（解决CORS问题）
 * 返回一个ReadableStream，模拟SSE流的行为
 */
export function backgroundSSE<T>(
  path: string,
  config: SSEConfig = {}
): { stream: ReadableStream<T>; requestId: string } {
  // 构建完整URL
  const baseUrl = "http://127.0.0.1:3000";
  const url = `${baseUrl}${path}`;
  const requestId = `sse_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  console.log("[ Api Client ] 启动SSE请求:", requestId, path, config);

  // 如果提供了onRequestInit回调，调用它
  if (config.onRequestInit) {
    config.onRequestInit(requestId);
  }

  // 创建可读流
  const originalStream = new ReadableStream<T>({
    start(controller) {
      let isStreamActive = true;

      // 添加消息监听器接收流数据
      const messageListener = (message: any) => {
        // 只处理与当前请求ID匹配的消息
        if (message.requestId !== requestId) return;

        console.log("[ Api Client ] 收到SSE消息:", message.type, requestId);

        if (message.type === "SSE_CHUNK") {
          // 收到数据块，放入流
          try {
            // 检查是否为[DONE]标记
            if (
              message.data === "[DONE]" ||
              (message.data && message.data.text === "[DONE]")
            ) {
              console.log("[ Api Client ] 收到DONE标记，流结束");
              // 不要放入流中，只是记录日志
              return;
            }

            controller.enqueue(message.data as T);

            // 如果提供了onChunk回调，调用它
            // if (config.onChunk) {
            //   config.onChunk(message.data, message as any);
            // }
          } catch (error) {
            console.error("[ Api Client ] 处理SSE数据块出错:", error);
            controller.error(error);
          }
        } else if (message.type === "SSE_COMPLETE") {
          // 流结束
          console.log("[ Api Client ] SSE流完成:", requestId);
          chrome.runtime.onMessage.removeListener(messageListener);
          isStreamActive = false;
          controller.close();
        } else if (message.type === "SSE_ERROR") {
          // 发生错误
          console.error("[ Api Client ] SSE流错误:", message.error);
          chrome.runtime.onMessage.removeListener(messageListener);
          isStreamActive = false;
          controller.error(new Error(message.error));
        }
      };

      // 注册消息监听器
      chrome.runtime.onMessage.addListener(messageListener);

      // 发送消息到background脚本启动SSE连接
      chrome.runtime.sendMessage({
        type: "API_SSE_REQUEST",
        requestId,
        url,
        config: {
          method: config.method || "GET",
          headers: config.headers || {},
          body: config.body,
          params: config.params,
          useEventSource: config.useEventSource,
        },
      });

      // 如果提供了onOpen回调，调用它
      if (config.onOpen) {
        config.onOpen(new Event("open"));
      }

      // 添加一个30秒超时，如果流没有得到任何数据
      const timeoutId = setTimeout(() => {
        if (isStreamActive) {
          console.warn("[ Api Client ] SSE请求超时:", requestId);
          chrome.runtime.onMessage.removeListener(messageListener);
          isStreamActive = false;
          controller.error(new Error("SSE请求超时 - 30秒内没有收到数据"));

          // 尝试取消请求
          chrome.runtime.sendMessage({
            type: "API_SSE_CANCEL",
            requestId,
          });
        }
      }, 30000);

      // 返回清理函数
      return () => {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    },

    cancel() {
      console.log("[ Api Client ] 取消SSE请求:", requestId);
      // 发送取消请求消息
      chrome.runtime.sendMessage({
        type: "API_SSE_CANCEL",
        requestId,
      });
    },
  });

  // 创建一个TransformStream来处理JSON解析
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      // 先检查是否为特殊标记[DONE]
      if (typeof chunk === "string" && chunk.trim() === "[DONE]") {
        console.log("[ Api Client ] 收到流结束标记 [DONE]");
        // 不向下游传递这个特殊标记
        return;
      }

      // 解析JSON字符串
      let parsedChunk: any = chunk;
      if (typeof chunk === "string") {
        try {
          parsedChunk = JSON.parse(chunk);
          console.log("[ Api Client ] 解析后的SSE数据:", parsedChunk);

          // 应用标准响应拦截器
          if (parsedChunk && parsedChunk.code === 0 && parsedChunk.data) {
            // 只传递data部分给下游
            controller.enqueue(parsedChunk.data);
          } else {
            // 错误处理或保持原样
            controller.enqueue(chunk);
          }
        } catch (parseError) {
          console.warn(
            "[ Api Client ] SSE数据JSON解析失败:",
            parseError,
            chunk
          );
          // 解析失败时传递原始chunk
          controller.enqueue(chunk);
        }
      } else {
        // 非字符串类型直接传递
        controller.enqueue(chunk);
      }
    },
  });

  // 将原始流通过transformStream处理
  const transformedStream = originalStream.pipeThrough(transformStream);

  return { stream: transformedStream, requestId };
}
