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

        // 流状态跟踪
        let isFirstChunk = true; // 标记第一个数据块
        let isJsonMode = null; // 处理模式(null=未知, true=JSON, false=文本)

        // 清理JSON内容的函数，移除SSE传输引入的控制字符，但保留内容中的空格
        const cleanJsonContent = (content: string): string => {
          // 移除SSE传输引入的控制字符（\r\n\t等），但保留内容中的空格
          return content
            .replace(/[\r\n\t]+/g, "") // 移除换行和制表符
            .trim(); // 移除两端空白，但保留内部空格
        };

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

          // 处理chunk数据
          try {
            // 如果chunk是以data:开头的消息
            if (isFirstChunk) {
              isFirstChunk = false;
              try {
                // 提取并解析首条消息
                const firstResponse = JSON.parse(
                  cleanJsonContent(chunk.split("data:")[1])
                );
                console.log("API状态检查:", firstResponse);

                // 检查接口状态
                if (firstResponse.code !== 0) {
                  const errorMsg = `API错误: ${
                    firstResponse.msg || "请求失败"
                  }`;
                  console.error(errorMsg);
                  controller.error(new Error(errorMsg));
                  return;
                }

                // 第一条是状态信息，不传递给下游
                console.log("API状态正常，继续处理后续数据");
                continue;
              } catch (e) {
                const errorMsg = "无效的API响应格式";
                console.error(errorMsg, e);
                controller.error(new Error(errorMsg));
                return;
              }
            }
            // 处理后续的消息 - 保留所有字符，包括空格
            else {
              // 如果有data:前缀，需要分割提取内容
              let character = chunk;
              if (chunk.includes("data:")) {
                character = chunk.split("data:")[1];
              }

              // 清理不可见字符，但保留内容空格
              if (character) {
                character = cleanJsonContent(character);
              }

              console.log("处理消息字符:", character);

              // 第二个数据块，确定处理模式
              if (isJsonMode === null) {
                // 检查是否是JSON(判断第一个非空白字符是否为'{')
                const firstNonWhitespace = character.trimStart()[0];
                isJsonMode = firstNonWhitespace === "{";
                console.log(
                  `确定数据模式: ${isJsonMode ? "JSON模式" : "文本模式"}`
                );
              }

              // 构造传递给下游的数据对象，包含模式信息
              const processedData: any = {
                isJsonMode: !!isJsonMode,
                content: character, // 清理后的内容
              };

              try {
                // 将处理后的数据传给下游
                controller.enqueue(processedData as T);
              } catch (dataError) {
                console.error("处理数据项时出错:", dataError);
              }
            }
          } catch (chunkError) {
            console.error(
              "Error processing SSE chunk:",
              chunkError,
              "Chunk:",
              chunk
            );
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
