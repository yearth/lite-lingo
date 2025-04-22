import { MessageHandler } from "./sse-handler";

/**
 * 流错误类型枚举
 */
export const errorTypes = {
  ABORTED: "ABORTED",
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  PARSE: "PARSE",
  UNKNOWN: "UNKNOWN",
};

/**
 * 对错误进行分类 (纯函数)
 */
export const categorizeError = (error: any) => {
  if (error.name === "AbortError")
    return { type: errorTypes.ABORTED, message: "翻译已取消" };

  if (error.message?.includes("timeout"))
    return { type: errorTypes.TIMEOUT, message: "翻译请求超时" };

  if (error.message?.includes("network") || error.message?.includes("fetch"))
    return { type: errorTypes.NETWORK, message: "网络连接错误" };

  if (error.message?.includes("parse") || error.message?.includes("JSON"))
    return { type: errorTypes.PARSE, message: "数据解析错误" };

  return { type: errorTypes.UNKNOWN, message: "翻译过程中发生错误" };
};

/**
 * 记录错误日志 (副作用函数)
 */
export const logError = (requestId: string, error: any) => {
  console.error(`[Stream] 错误: ${requestId}`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause,
  });
};

/**
 * 错误消息接口
 */
export interface ErrorMessage {
  type: "error";
  requestId: string;
  error: string;
}

/**
 * 创建错误处理函数
 */
export const createErrorHandler = (
  requestId: string,
  tabId?: number,
  messageHandler?: MessageHandler
) => {
  return (error: any) => {
    // 格式化错误消息
    const errorMessage: ErrorMessage = {
      type: "error",
      requestId,
      error: error.message || String(error),
    };

    // 记录错误
    console.error(`[流错误][${requestId}]`, error);

    // 如果提供了消息处理函数，使用它发送错误消息
    if (messageHandler) {
      messageHandler(errorMessage);
    }

    // 如果提供了标签页ID，向标签页发送错误消息
    if (tabId) {
      try {
        chrome.tabs.sendMessage(tabId, errorMessage);
      } catch (e) {
        console.error(`向标签页发送错误消息失败: ${e}`);
      }
    }
  };
};

/**
 * 创建完成处理器
 */
export const createCompletionHandler = (
  requestId: string,
  tabId: number,
  messageHandler?: (message: any) => void
) => {
  return () => {
    console.log(`[完成][${requestId}] 流处理完成`);

    // 如果提供了消息处理器，发送完成消息
    if (messageHandler) {
      messageHandler({
        type: "done",
        requestId,
      });
    }

    // 向标签页发送完成消息
    if (tabId > 0) {
      chrome.tabs
        .sendMessage(tabId, {
          action: "streamDone",
          requestId,
        })
        .catch((e) => {
          console.error(`无法向标签页 ${tabId} 发送完成消息:`, e);
        });
    }
  };
};
