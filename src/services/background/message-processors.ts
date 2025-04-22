import { createErrorHandler } from "../stream/error-handlers";
import { handleSSEStream, StreamContext } from "../stream/stream-handlers";

/**
 * 解析传入的消息参数
 */
export const parseMessageArgs = (
  request: any,
  sender: chrome.runtime.MessageSender
): { action: string; tabId: number; args: any[] } => {
  const { action, args = [] } = request;
  const tabId = sender.tab?.id || -1;
  return { action, tabId, args };
};

/**
 * 记录接收到的消息
 */
export const logReceivedMessage = (
  action: string,
  tabId: number,
  args: any[]
): void => {
  console.log(
    `[背景] 收到消息: ${action}，来自标签 ${tabId}`,
    args.length > 0
      ? `参数: ${JSON.stringify(args[0]).substring(0, 100)}...`
      : "无参数"
  );
};

/**
 * 处理TTS请求
 */
export const handleTtsRequest = (
  requestUrl: string,
  requestId: string,
  tabId: number
): Promise<any> => {
  console.log(`[背景] 发送TTS请求: ${requestId}，终点: ${requestUrl}`);

  return fetch(requestUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `TTS请求失败: ${response.status} ${response.statusText}`
        );
      }

      console.log(`[背景] TTS请求成功: ${requestId}`);
      return response.json();
    })
    .then((data) => {
      console.log(`[背景] TTS响应: ${requestId}`, data);
      return { data, requestId };
    })
    .catch((error) => {
      const errorHandler = createErrorHandler(requestId, tabId);
      errorHandler(error);
      throw error;
    });
};

/**
 * 处理流式请求
 */
export const handleStreamRequest = async (
  requestUrl: string,
  requestId: string,
  tabId: number,
  messageHandler: any
): Promise<void> => {
  console.log(`[背景] 发送流式请求: ${requestId}，终点: ${requestUrl}`);

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("响应没有包含数据流");
    }

    console.log(`[背景] 流式请求成功: ${requestId}`);

    const reader = response.body.getReader();
    const streamContext: StreamContext = {
      reader,
      requestId,
      tabId,
      messageHandler,
    };

    await handleSSEStream(streamContext);
  } catch (error) {
    const errorHandler = createErrorHandler(requestId, tabId, messageHandler);
    errorHandler(error);
  }
};

/**
 * 处理文本请求
 */
export const handleTextRequest = (
  requestUrl: string,
  requestId: string,
  tabId: number
): Promise<any> => {
  console.log(`[背景] 发送文本请求: ${requestId}，终点: ${requestUrl}`);

  return fetch(requestUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `文本请求失败: ${response.status} ${response.statusText}`
        );
      }

      console.log(`[背景] 文本请求成功: ${requestId}`);
      return response.text();
    })
    .then((text) => {
      console.log(
        `[背景] 文本响应: ${requestId}`,
        text.substring(0, 100) + "..."
      );
      return { text, requestId };
    })
    .catch((error) => {
      const errorHandler = createErrorHandler(requestId, tabId);
      errorHandler(error);
      throw error;
    });
};
