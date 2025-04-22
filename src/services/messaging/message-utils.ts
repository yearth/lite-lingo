/**
 * 接口定义
 */
export interface Message {
  type: string;
  requestId: string;
  data?: any;
  error?: any;
}

/**
 * 创建消息对象 (纯函数)
 */
export const createMessage = (
  type: string,
  requestId: string,
  data?: any
): Message => ({
  type,
  requestId,
  data,
});

/**
 * 创建JSON模式消息
 */
export const toJsonModeMessage = (
  requestId: string,
  section: string,
  data: any
) => createMessage("SSE_CHUNK", requestId, { section, data });

/**
 * 创建文本模式消息
 */
export const toTextModeMessage = (
  requestId: string,
  text: string,
  isPartial = false,
  chunkIndex = 0
) =>
  createMessage("SSE_CHUNK", requestId, {
    text,
    isTextMode: true,
    isPartial,
    chunkIndex,
  });

/**
 * 创建完成消息
 */
export const toCompleteMessage = (requestId: string, data?: any) =>
  createMessage("SSE_COMPLETE", requestId, data);

/**
 * 创建文本完成消息
 */
export const toTextCompleteMessage = (requestId: string, totalChunks: number) =>
  createMessage("SSE_TEXT_COMPLETE", requestId, { totalChunks });

/**
 * 创建错误消息
 */
export const toErrorMessage = (requestId: string, error: any) => ({
  type: "SSE_ERROR",
  requestId,
  error,
});

/**
 * 发送消息 (副作用函数)
 */
export const sendMessage = async (
  tabId: number,
  message: Message
): Promise<boolean> => {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (err) {
    console.error(`[Messaging] 发送消息失败: ${message.type}`, err);
    return false;
  }
};

/**
 * 记录消息
 */
export const logMessage = (direction: "SEND" | "RECEIVE", message: Message) => {
  const prefix = direction === "SEND" ? "→" : "←";
  console.log(
    `[Messaging] ${prefix} ${message.type} [${message.requestId}]`,
    message.data
      ? typeof message.data === "string"
        ? message.data.substring(0, 50) +
          (message.data.length > 50 ? "..." : "")
        : message.data
      : ""
  );
};

/**
 * 发送并记录消息 (组合函数)
 */
export const sendAndLogMessage = async (
  tabId: number,
  message: Message
): Promise<boolean> => {
  logMessage("SEND", message);
  return sendMessage(tabId, message);
};

/**
 * 创建通知完成功能
 */
export const notifyComplete =
  (requestId: string, tabId: number) => async () => {
    console.log(`[Stream] 流正常结束: ${requestId}`);
    return sendAndLogMessage(tabId, toCompleteMessage(requestId));
  };
