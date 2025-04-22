import {
  sendAndLogMessage,
  toTextCompleteMessage,
  toTextModeMessage,
} from "../messaging/message-utils";
import { createErrorHandler } from "./error-handlers";

// 配置参数
const MAX_TEXT_CHUNK_SIZE = 1000;

// 接口定义
export interface StreamChunk {
  isJsonMode: boolean;
  content: any;
}

export interface StreamContext {
  reader: ReadableStreamDefaultReader<any>;
  requestId: string;
  tabId: number;
  messageHandler: any;
}

/**
 * 记录流数据
 */
export const logStreamData = (requestId: string, done: boolean, value: any) => {
  if (value && !done) {
    console.log(`[Stream] 读取数据: ${requestId}`, {
      done,
      value: typeof value === "object" ? "[Object]" : value,
      size:
        typeof value === "object"
          ? JSON.stringify(value).length
          : String(value).length,
    });
  } else {
    console.log(`[Stream] 读取数据: ${requestId}`, { done });
  }
  return { done, value, requestId };
};

/**
 * 验证数据格式
 */
export const isValidStreamData = (value: any): boolean =>
  value &&
  typeof value === "object" &&
  "isJsonMode" in value &&
  typeof value.isJsonMode === "boolean" &&
  "content" in value;

/**
 * 记录无效数据
 */
export const logInvalidData = (requestId: string, value: any) => {
  console.warn(`[Stream] 收到非预期格式数据: ${requestId}`, {
    type: typeof value,
    value: value
      ? typeof value === "object"
        ? JSON.stringify(value).substring(0, 100)
        : String(value)
      : "null",
    hasIsJsonMode:
      value && typeof value === "object" ? "isJsonMode" in value : false,
  });
  return { requestId, value, isValid: false };
};

/**
 * 处理流数据
 */
export const processStreamData = async (
  chunk: StreamChunk,
  requestId: string,
  tabId: number,
  messageHandler: any
): Promise<void> => {
  const mode = chunk.isJsonMode ? "JSON" : "文本";
  console.log(`[Stream] 处理${mode}模式数据: ${requestId}`);

  if (chunk.isJsonMode) {
    // JSON模式 - 传递给解析器
    await messageHandler.handleChunk(chunk.content);
  } else {
    // 文本模式 - 直接发送到前端或分片处理
    await processTextModeData(chunk.content, requestId, tabId);
  }
};

/**
 * 处理文本模式数据
 */
export const processTextModeData = async (
  content: any,
  requestId: string,
  tabId: number
): Promise<void> => {
  // 确保content是字符串
  const textContent =
    typeof content === "string" ? content : JSON.stringify(content);

  // 判断是否需要分片处理
  if (textContent.length <= MAX_TEXT_CHUNK_SIZE) {
    // 小文本直接发送
    await sendTextContent(textContent, requestId, tabId);
    return;
  }

  // 对大文本进行分片处理
  console.log(
    `[Stream] 大型文本(${textContent.length}字符)将分片处理: ${requestId}`
  );
  await processLargeTextContent(textContent, requestId, tabId);
};

/**
 * 发送文本内容
 */
export const sendTextContent = async (
  text: string,
  requestId: string,
  tabId: number
): Promise<boolean> => {
  console.log(
    `[Stream] 文本模式，发送到前端: ${requestId}`,
    text.substring(0, 50) + (text.length > 50 ? "..." : "")
  );

  return sendAndLogMessage(tabId, toTextModeMessage(requestId, text));
};

/**
 * 处理大型文本
 */
export const processLargeTextContent = async (
  content: string,
  requestId: string,
  tabId: number
): Promise<void> => {
  let position = 0;
  let chunkIndex = 0;

  while (position < content.length) {
    // 计算当前块的结束位置
    const end = Math.min(position + MAX_TEXT_CHUNK_SIZE, content.length);

    // 尝试在句子边界切分
    let segmentEnd = end;
    if (end < content.length) {
      // 查找句号、问号、感叹号等断句标记
      const sentenceBreaks = [".", "?", "!", "。", "？", "！", "\n"];
      for (let i = end; i > position && i > end - 100; i--) {
        if (sentenceBreaks.includes(content[i])) {
          segmentEnd = i + 1;
          break;
        }
      }
    }

    const chunk = content.substring(position, segmentEnd);

    // 发送当前块
    try {
      await sendAndLogMessage(
        tabId,
        toTextModeMessage(
          requestId,
          chunk,
          segmentEnd < content.length,
          chunkIndex++
        )
      );
    } catch (err) {
      console.error(`[Stream] 发送文本块失败: ${requestId}`, err);
      break;
    }

    position = segmentEnd;

    // 如果还有更多块，添加小延迟避免UI阻塞
    if (position < content.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // 发送分片完成消息
  if (chunkIndex > 1) {
    try {
      await sendAndLogMessage(
        tabId,
        toTextCompleteMessage(requestId, chunkIndex)
      );
    } catch (err) {
      console.error(`[Stream] 发送文本完成消息失败: ${requestId}`, err);
    }
  }
};

/**
 * 主要流处理函数
 */
export const handleSSEStream = async (
  context: StreamContext
): Promise<void> => {
  const { reader, requestId, tabId, messageHandler } = context;
  const handleError = createErrorHandler(requestId, tabId, messageHandler);

  try {
    // 主处理循环
    while (true) {
      // 读取数据块
      const { done, value } = await reader.read();

      // 记录数据
      logStreamData(requestId, done, value);

      // 检查流是否结束
      if (done) {
        console.log(`[Stream] 流结束: ${requestId}`);
        break;
      }

      // 验证数据格式
      if (!isValidStreamData(value)) {
        logInvalidData(requestId, value);
        continue;
      }

      // 处理数据
      await processStreamData(
        value as StreamChunk,
        requestId,
        tabId,
        messageHandler
      );
    }

    // 处理流正常结束
    console.log(`[Stream] 流正常结束: ${requestId}`);
    await sendAndLogMessage(tabId, { type: "SSE_COMPLETE", requestId });
  } catch (error) {
    // 处理流错误
    handleError(error);
  }
};
