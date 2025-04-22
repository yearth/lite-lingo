import { handleStreamError } from "./error-handler";
import { JsonModeChunk } from "./validator";

// 文本块大小限制
const MAX_TEXT_CHUNK_SIZE = 1000;

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

/**
 * 处理JSON模式数据
 * 暂时简化处理，直接发送到前端显示
 */
export async function processJsonModeData(
  content: any,
  requestId: string,
  tabId: number
) {
  console.log(`[Background] JSON模式，发送到前端: ${requestId}`);

  try {
    // 确保content是可序列化的对象
    const jsonContent =
      typeof content === "string" ? content : JSON.stringify(content);

    // 直接发送到前端显示
    await chrome.tabs.sendMessage(tabId, {
      type: "SSE_CHUNK",
      requestId,
      data: {
        json: content, // 原始JSON数据
        text: jsonContent, // 字符串形式
        isJsonMode: true,
      },
    });
  } catch (error) {
    console.error(`[Background] 处理JSON数据失败: ${requestId}`, error);
    handleStreamError(error, requestId, tabId);
  }
}

/**
 * 处理文本模式数据
 */
export async function processTextModeData(
  content: any,
  requestId: string,
  tabId: number
) {
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
    `[Background] 大型文本(${textContent.length}字符)将分片处理: ${requestId}`
  );
  await processLargeTextContent(textContent, requestId, tabId);
}

/**
 * 发送文本内容
 */
export async function sendTextContent(
  text: string,
  requestId: string,
  tabId: number
): Promise<void> {
  try {
    console.log(
      `[Background] 文本模式，发送到前端: ${requestId}`,
      text.substring(0, 50) + (text.length > 50 ? "..." : "")
    );

    await chrome.tabs.sendMessage(tabId, {
      type: "SSE_CHUNK",
      requestId,
      data: { text, isTextMode: true },
    });
  } catch (err) {
    console.error(`[Background] 发送文本模式数据失败: ${requestId}`, err);
  }
}

/**
 * 处理大型文本
 */
export async function processLargeTextContent(
  content: string,
  requestId: string,
  tabId: number
) {
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
      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_CHUNK",
        requestId,
        data: {
          text: chunk,
          isTextMode: true,
          isPartial: segmentEnd < content.length,
          chunkIndex: chunkIndex++,
        },
      });
    } catch (err) {
      console.error(`[Background] 发送文本块失败: ${requestId}`, err);
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
      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_TEXT_COMPLETE",
        requestId,
        data: { totalChunks: chunkIndex },
      });
    } catch (err) {
      console.error(`[Background] 发送文本完成消息失败: ${requestId}`, err);
    }
  }
}
