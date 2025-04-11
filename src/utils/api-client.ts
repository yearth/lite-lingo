// Removed incorrect import: import type { StreamEventPayload } from "../types/messaging";

/**
 * SSE 事件 data 字段的结构 (根据 API 文档)
 */
export interface StreamEventPayload<P = any> { // Add export
  /**
   * 事件类型: 'text_chunk', 'error', 'done', etc.
   */
  type: string;
  /**
   * 事件的具体数据负载，结构取决于 type
   */
  payload: P;
}

/**
 * 后端 API 响应的基础结构 (保持不变)
 */
export interface ApiResponse<D = any> {
  code: string | number; // Allow number for HTTP status codes in errors
  message: string;
  /** 业务数据负载 */
  data: D | null; // Allow null for errors
}

// 可以定义一个更具体的业务负载基础类型，或者让调用者提供
export interface BusinessDataPayload {
  [key: string]: any;
}

// 定义基础 URL (后续应来自配置)
const BASE_URL = "http://127.0.0.1:3000";

// --- Standard API Client (Renamed) ---

/**
 * 内部函数：处理标准的 JSON API 请求。
 * @template T 预期从响应的 data 字段中成功返回的业务数据类型。
 */
const _apiClientStandard = async <T = BusinessDataPayload>(
  endpoint: string,
  options: RequestInit = {},
  signal?: AbortSignal | null | undefined
): Promise<T> => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json", // Explicitly accept JSON for standard requests
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: signal ?? undefined,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // --- HTTP 错误处理 ---
    if (!response.ok) {
      let errorMsg =
        response.statusText || `HTTP error! status: ${response.status}`;
      try {
        // Try to parse potential error details from JSON body
        const errorData: Partial<ApiResponse> = await response.json();
        if (
          errorData &&
          typeof errorData.message === "string" &&
          errorData.message
        ) {
          errorMsg = `[${response.status}] ${errorData.message}`; // Prepend status
        }
      } catch (jsonError) {
        console.warn("Failed to parse error response body as JSON", jsonError);
      }
      throw new Error(errorMsg);
    }

    // --- 成功响应处理与拦截器 ---
    const responseBody: ApiResponse<T> = await response.json();

    // Check for business error code (assuming '0' is success)
    if (responseBody.code === "0" || responseBody.code === 0) {
      // 业务成功，返回内层 data (handle potential null data if needed)
      // Adding a check for null data as ApiResponse allows it
      if (responseBody.data === null || responseBody.data === undefined) {
        // Decide how to handle null data on success: return null, throw error, or return default value?
        // Returning null for now, adjust as needed.
        console.warn(
          `API Success (Code: ${responseBody.code}) but data is null for endpoint: ${endpoint}`
        );
        return null as T; // Or handle differently
      }
      return responseBody.data;
    } else {
      // 业务失败
      const errorMessage =
        responseBody.message || `API Error: Code ${responseBody.code}`;
      console.error(
        `API Business Error (Code: ${responseBody.code}): ${errorMessage}`
      );
      throw new Error(errorMessage);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("API Request Aborted:", endpoint);
      throw error; // Re-throw AbortError
    }
    console.error("API Client Standard Error:", error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An unknown error occurred in _apiClientStandard");
    }
  }
};

// --- SSE API Client ---

/**
 * SSE 事件回调接口
 */
export interface SseCallbacks {
  /** 当 SSE 连接成功打开时调用 (收到第一个字节后) */
  onOpen?: () => void;
  /** 当收到并成功解析一个 SSE 事件时调用 */
  onMessage: (data: ApiResponse<StreamEventPayload>) => void; // Use specific StreamEventPayload type if available
  /** 当发生网络错误、连接错误或解析错误时调用 */
  onError: (error: Error) => void;
  /** 当 SSE 连接关闭时调用 (无论正常或异常) */
  onClose?: () => void;
}

/**
 * 内部函数：处理 Server-Sent Events (SSE) 流式请求。
 */
const _apiClientSSE = async (
  endpoint: string,
  options: RequestInit = {}, // Expects method: 'POST', body etc.
  callbacks: SseCallbacks,
  signal?: AbortSignal | null | undefined
): Promise<void> => {
  const defaultHeaders = {
    "Content-Type": "application/json", // Request body is JSON
    Accept: "text/event-stream", // Expect SSE stream in response
  };

  const config: RequestInit = {
    ...options, // Ensure method: 'POST' and body are provided by caller
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    signal: signal ?? undefined,
    cache: "no-store", // Ensure no caching for SSE
  };

  let response: Response | null = null; // To access response outside try block

  try {
    console.log(`[SSE Client] Connecting to ${BASE_URL}${endpoint}`);
    response = await fetch(`${BASE_URL}${endpoint}`, config);

    // --- HTTP 错误处理 (发生在流开始之前) ---
    if (!response.ok) {
      let errorMsg =
        response.statusText || `HTTP error! status: ${response.status}`;
      try {
        const errorData: Partial<ApiResponse> = await response.json();
        if (
          errorData &&
          typeof errorData.message === "string" &&
          errorData.message
        ) {
          errorMsg = `[${response.status}] ${errorData.message}`;
        }
      } catch (jsonError) {
        console.warn(
          "[SSE Client] Failed to parse initial error response body as JSON",
          jsonError
        );
      }
      throw new Error(errorMsg); // Throw before attempting to read stream
    }

    if (!response.body) {
      throw new Error("Response body is null, cannot process SSE stream.");
    }

    console.log(
      "[SSE Client] Connection established, starting stream processing."
    );
    callbacks.onOpen?.(); // Signal stream opened

    // Process the stream
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("[SSE Client] Stream finished.");
        break; // Exit loop when stream ends
      }

      buffer += value;
      let eolIndex; // End of line index

      // Process buffer line by line
      while ((eolIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, eolIndex).trim();
        console.log("[SSE Client] Processing line:", line); // Debug log
        buffer = buffer.slice(eolIndex + 1); // Remove processed line from buffer

        if (line.startsWith("data:")) {
          const jsonData = line.slice(5).trim(); // Get content after "data:"
          if (jsonData) {
            // --->>> 添加 [DONE] 检查 <<<---
            if (jsonData === "[DONE]") {
              console.log("[SSE Client] Received [DONE] marker.");
              // 不需要调用 onMessage，循环将在下一次 read() 时因 done=true 而结束
              // 或者如果需要立即触发 onClose，可以在这里 break 或直接调用 onClose
              // break; // 退出 while 循环，让外层循环处理 done
            } else {
              // --->>> 只有在不是 [DONE] 时才解析 <<<---
              console.log("[SSE Client] Received data:", jsonData); // Debug log
              try {
                const parsedData: ApiResponse<StreamEventPayload> =
                  JSON.parse(jsonData);
                console.log("[SSE Client] Received message:", parsedData); // Debug log
                callbacks.onMessage(parsedData);
              } catch (parseError: any) { // Add : any and ensure catch is inside else
                console.error(
                  "[SSE Client] Error parsing SSE data JSON:",
                  parseError,
                  "Data:",
                  jsonData
                );
                // Decide if parsing error is fatal
                callbacks.onError(
                  parseError instanceof Error
                    ? parseError
                    : new Error("Failed to parse SSE JSON data")
                );
                // Optionally break or continue based on error handling strategy
              }
            } // End of else block (was missing before)
          } // End of if(jsonData)
        } else if (line) {
          // Ignore comments (lines starting with ':') or empty lines, log others if needed
          // console.log("[SSE Client] Received non-data line:", line);
        }
      }
    }
  } catch (error) {
    console.error("[SSE Client] Error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[SSE Client] Request Aborted:", endpoint);
      // AbortError should be handled by the caller via the signal
      // We call onError to notify about the failure cause.
      callbacks.onError(error);
    } else if (error instanceof Error) {
      callbacks.onError(error);
    } else {
      callbacks.onError(
        new Error("An unknown error occurred in _apiClientSSE")
      );
    }
  } finally {
    console.log("[SSE Client] Cleaning up.");
    callbacks.onClose?.(); // Signal stream closed, regardless of reason
    // Note: The reader is automatically released when the loop finishes or throws.
  }
};

// --- Exported Client Object ---

export const apiClient = {
  /**
   * Performs a standard API request expecting a JSON response.
   * @template T Expected data type in the response's `data` field.
   * @param {string} endpoint API endpoint.
   * @param {RequestInit} [options={}] Fetch options.
   * @param {AbortSignal | null | undefined} [signal] AbortSignal.
   * @returns {Promise<T>} The `data` field from the API response.
   */
  standard: _apiClientStandard,

  /**
   * Performs an API request expecting a Server-Sent Events (SSE) stream.
   * @param {string} endpoint API endpoint.
   * @param {RequestInit} options Fetch options (must include method, body etc.).
   * @param {SseCallbacks} callbacks Callbacks for handling SSE events (onOpen, onMessage, onError, onClose).
   * @param {AbortSignal | null | undefined} [signal] AbortSignal.
   * @returns {Promise<void>} Resolves when the stream handling is initiated (or fails initially). Actual events are handled via callbacks.
   */
  sse: _apiClientSSE,
};

// Default export can be the object itself or removed if only named exports are preferred
export default apiClient;
