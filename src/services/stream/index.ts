/**
 * 流处理模块入口文件
 */
import { handleStreamError } from "./error-handler";
import { processJsonModeData } from "./json";
import { processTextModeData } from "./processor";
import { JsonModeChunk } from "./validator";

export { handleStreamError, processJsonModeData, processTextModeData };

/**
 * 处理流数据
 */
export async function processStreamData(
  value: any,
  requestId: string,
  tabId: number
) {
  const chunk = value as JsonModeChunk;
  const mode = chunk.isJsonMode ? "JSON" : "文本";

  console.log(`[Background] 处理${mode}模式数据: ${requestId}`);

  if (chunk.isJsonMode) {
    // 处理JSON模式数据
    await processJsonModeData(chunk.content, requestId, tabId);
  } else {
    // 处理文本模式数据
    await processTextModeData(chunk.content, requestId, tabId);
  }
}
