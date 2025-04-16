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
  onRequestInit?: (requestId: string) => void; // 请求初始化时的回调，提供requestId
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
          console.log("SSE raw chunk:", chunk);

          // 处理块数据 (可能包含多个JSON对象)
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            try {
              // 处理data:前缀的行
              if (line.startsWith("data:")) {
                const dataContent = line.slice(5).trim();

                // 特殊处理[DONE]标记
                if (dataContent === "[DONE]") {
                  console.log("SSE stream completed with [DONE] marker");
                  // 不需要将[DONE]放入流中，只需要标记结束
                  // 这里不调用controller.close()以便上层代码能继续读取之前的数据
                  continue;
                }

                try {
                  // 尝试将数据解析为JSON
                  const data = JSON.parse(dataContent);
                  console.log("SSE parsed data:", data);
                  controller.enqueue(data as T);

                  // 如果提供了onChunk回调，调用它
                  if (fetchConfig.onChunk) {
                    fetchConfig.onChunk(data, { data: dataContent } as any);
                  }
                } catch (parseError) {
                  console.error(
                    "Error parsing SSE JSON data:",
                    parseError,
                    "Raw data:",
                    dataContent
                  );
                  // 可选：如果解析失败但仍希望将原始数据传递出去
                  // controller.enqueue({ raw: dataContent } as unknown as T);
                }
              } else if (line.trim() !== "") {
                // 处理不以data:开头但非空的行，记录日志
                console.log("SSE non-data line:", line);
              }
            } catch (lineError) {
              console.error(
                "Error processing SSE line:",
                lineError,
                "Line:",
                line
              );
            }
          }
        }
      } catch (error) {
        // 处理fetch错误
        console.error("SSE fetch error:", error);
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
          // 尊重用户传入的method，如果没有设置则默认为GET
          method: config.method || "GET",
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
