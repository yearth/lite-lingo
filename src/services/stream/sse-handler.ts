/**
 * 流上下文接口
 */
export interface StreamContext {
  requestId: string;
  isCancelled: boolean;
  cancel: () => void;
}

/**
 * 消息处理函数类型
 */
export type MessageHandler = (message: any) => void;

/**
 * 处理SSE流
 * @param response 响应对象
 * @param context 流上下文
 * @param messageHandler 消息处理函数
 */
export const handleSSEStream = async (
  response: Response,
  context: StreamContext,
  messageHandler: MessageHandler
): Promise<void> => {
  // 获取响应reader
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法获取响应流");
  }

  try {
    const decoder = new TextDecoder();
    let buffer = "";

    // 读取流数据
    while (!context.isCancelled) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value) {
        // 解码新接收的数据
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理完整的SSE消息
        const messages = parseSSEMessages(buffer);
        if (messages.length > 0) {
          // 更新缓冲区，仅保留未完成的消息
          const lastNewlinePos = buffer.lastIndexOf("\\n\\n");
          buffer =
            lastNewlinePos !== -1 ? buffer.slice(lastNewlinePos + 2) : buffer;

          // 处理每条消息
          for (const message of messages) {
            if (context.isCancelled) break;
            messageHandler(message);
          }
        }
      }
    }
  } finally {
    // 确保reader被释放
    reader.cancel().catch((err) => {
      console.error(`取消流读取失败: ${err}`);
    });
  }
};

/**
 * 解析SSE消息
 * @param data 原始SSE数据
 * @returns 解析后的消息对象数组
 */
function parseSSEMessages(data: string): any[] {
  const messages: any[] = [];
  const messageStrings = data
    .split("\\n\\n")
    .filter((str) => str.trim() !== "");

  for (const messageStr of messageStrings) {
    try {
      // 移除'data:'前缀并解析JSON
      const jsonStr = messageStr.replace(/^data: /, "").trim();
      if (jsonStr && jsonStr !== "[DONE]") {
        const parsed = JSON.parse(jsonStr);
        messages.push(parsed);
      } else if (jsonStr === "[DONE]") {
        // 处理流结束标记
        messages.push({ type: "done" });
      }
    } catch (e) {
      console.warn(`解析SSE消息失败: ${e}`);
    }
  }

  return messages;
}

/**
 * 处理SSE数据块
 */
const processSSEChunk = (
  chunk: string,
  { requestId, tabId, messageHandler }: StreamContext
) => {
  // 按行分割数据
  const lines = chunk.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    try {
      // 提取JSON数据
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;

      const data = JSON.parse(jsonStr);

      // 记录接收到的数据
      console.log(`[流数据][${requestId}]`, data);

      // 如果有消息处理器，处理消息
      if (messageHandler) {
        messageHandler({
          type: "data",
          requestId,
          data,
        });
      }

      // 向标签页发送数据
      if (tabId > 0) {
        chrome.tabs
          .sendMessage(tabId, {
            action: "streamData",
            requestId,
            data,
          })
          .catch((e) => {
            console.error(`无法向标签页 ${tabId} 发送流数据:`, e);
          });
      }
    } catch (error) {
      console.error(`[解析错误][${requestId}] 无法解析SSE数据:`, line, error);
    }
  }
};
