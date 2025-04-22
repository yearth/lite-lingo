import { StreamErrorType } from "./error-types";

/**
 * 处理流错误
 */
export function handleStreamError(
  error: any,
  requestId: string,
  tabId: number
) {
  // 记录详细的错误信息
  console.error(`[Background] SSE错误: ${requestId}`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  });

  // 错误类型区分
  let errorType = StreamErrorType.UNKNOWN;
  let userMessage = "翻译过程中发生错误";

  if (error.name === "AbortError") {
    errorType = StreamErrorType.ABORTED;
    userMessage = "翻译已取消";
  } else if (error.message?.includes("timeout")) {
    errorType = StreamErrorType.TIMEOUT;
    userMessage = "翻译请求超时";
  } else if (
    error.message?.includes("network") ||
    error.message?.includes("fetch")
  ) {
    errorType = StreamErrorType.NETWORK;
    userMessage = "网络连接错误";
  } else if (
    error.message?.includes("parse") ||
    error.message?.includes("JSON")
  ) {
    errorType = StreamErrorType.PARSE;
    userMessage = "数据解析错误";
  }

  // 向前端发送结构化错误
  chrome.tabs
    .sendMessage(tabId, {
      type: "SSE_ERROR",
      requestId,
      error: {
        type: errorType,
        message: userMessage,
        details: error.message,
      },
    })
    .catch((err) => {
      console.error(`[Background] 发送错误信息失败: ${requestId}`, err);
    });
}

/**
 * 通知流完成
 */
export function notifyStreamComplete(requestId: string, tabId: number) {
  console.log(`[Background] SSE流正常结束: ${requestId}`);

  chrome.tabs
    .sendMessage(tabId, {
      type: "SSE_COMPLETE",
      requestId,
    })
    .catch((err) => {
      console.error(`[Background] 发送SSE完成消息失败: ${requestId}`, err);
    });
}
