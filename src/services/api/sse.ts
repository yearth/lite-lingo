/**
 * SSE流式请求模块
 */
import { RequestConfig, prepareRequest } from "./abortController";
import { createRequestConfig } from "./core";
import { buildUrl, handleError } from "./utils";

// SSE请求配置
export interface SSEConfig extends RequestConfig {
  onChunk?: (chunk: any, event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onError?: (error: Event) => void;
  eventType?: string; // 指定要监听的事件类型，默认为'message'
}

/**
 * 创建可读流来处理SSE连接
 */
function createSSEReadableStream<T>(
  url: string,
  config: SSEConfig = {},
  signal: AbortSignal
): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      // 创建EventSource连接
      const eventSource = new EventSource(url);
      let isFirst = true;

      // 监听open事件
      eventSource.onopen = (event) => {
        if (config.onOpen) {
          config.onOpen(event);
        }
      };

      // 监听message事件 (或自定义事件类型)
      const eventType = config.eventType || "message";
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          // 解析数据
          let data: any = event.data;

          try {
            // 尝试将数据解析为JSON
            data = JSON.parse(data);
          } catch (e) {
            // 如果不是有效的JSON，保持原样
          }

          // 将数据块放入流
          controller.enqueue(data as T);

          // 如果提供了onChunk回调，调用它
          if (config.onChunk) {
            config.onChunk(data, event);
          }
        } catch (error) {
          controller.error(error);
        }
      });

      // 监听错误
      eventSource.onerror = (event) => {
        if (config.onError) {
          config.onError(event);
        }

        // 关闭连接并结束流
        eventSource.close();
        controller.close();
      };

      // 处理取消信号
      signal.addEventListener("abort", () => {
        eventSource.close();
        controller.close();
      });
    },
  });
}

/**
 * 创建基于fetch的流式请求
 */
function createFetchStream<T>(
  url: string,
  fetchConfig: RequestConfig,
  signal: AbortSignal
): ReadableStream<T> {
  return new ReadableStream<T>({
    async start(controller) {
      try {
        // 发起fetch请求
        const response = await fetch(url, {
          ...fetchConfig,
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 读取流数据
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            break;
          }

          // 解码二进制数据
          const chunk = decoder.decode(value, { stream: true });

          // 处理块数据 (可能包含多个JSON对象)
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            try {
              if (line.startsWith("data:")) {
                const jsonStr = line.slice(5).trim();
                const data = JSON.parse(jsonStr);
                controller.enqueue(data as T);
              }
            } catch (error) {
              console.error("Error parsing SSE data:", error);
            }
          }
        }
      } catch (error) {
        // 处理fetch错误
        if (signal.aborted) {
          controller.close();
        } else {
          controller.error(error);
        }
      }
    },
  });
}

/**
 * SSE流式请求
 * 支持EventSource和基于fetch的流式处理
 */
export const sse =
  (baseUrl: string) =>
  <T>(path: string, config: SSEConfig = {}): ReadableStream<T> => {
    const { signal, requestId } = prepareRequest(config);
    const url = buildUrl(`${baseUrl}${path}`, config.params);

    try {
      // 选择实现方式 - 默认为EventSource
      const useEventSource = config.useEventSource !== false;

      if (useEventSource) {
        // 使用EventSource (原生SSE)
        return createSSEReadableStream<T>(url, config, signal);
      } else {
        // 使用fetch流
        const fetchConfig = createRequestConfig(config, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            ...config.headers,
          },
          signal,
        });

        return createFetchStream<T>(url, fetchConfig, signal);
      }
    } catch (error) {
      // 创建一个已关闭的流，同时抛出错误
      const errorStream = new ReadableStream<T>({
        start(controller) {
          controller.error(handleError(error, requestId));
        },
      });

      return errorStream;
    }
  };
