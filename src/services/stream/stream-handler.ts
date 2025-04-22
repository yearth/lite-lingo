import { handleStreamError, notifyStreamComplete } from "./error-handler";
import { processStreamData } from "./processor";
import { isValidStreamData, logInvalidData, logStreamData } from "./validator";

/**
 * 处理SSE流数据
 */
export async function handleSSEStream(
  reader: ReadableStreamDefaultReader<any>,
  requestId: string,
  tabId: number
) {
  try {
    // 主处理循环
    while (true) {
      // 读取数据块
      const { done, value } = await reader.read();

      // 记录数据
      logStreamData(requestId, done, value);

      // 检查流是否结束
      if (done) {
        console.log(`[Background] SSE流结束: ${requestId}`);
        break;
      }

      // 验证数据格式
      if (!isValidStreamData(value)) {
        logInvalidData(requestId, value);
        continue;
      }

      // 根据模式处理数据
      await processStreamData(value, requestId, tabId);
    }

    // 处理流正常结束
    notifyStreamComplete(requestId, tabId);
  } catch (error) {
    // 处理流错误
    handleStreamError(error, requestId, tabId);
  }
}
