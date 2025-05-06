/**
 * 流处理模块入口文件
 */
import { handleStreamError } from "./error-handler";
import { processTextModeData } from "./processor";

export { handleStreamError, processTextModeData };

/**
 * 处理流数据
 */
export async function processStreamData(
  value: any,
  requestId: string,
  tabId: number
) {
  console.log(`[Background] 处理文本数据: ${requestId}`);
  await processTextModeData(value.content, requestId, tabId);
}
