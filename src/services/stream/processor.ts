import { handleStreamError } from "./error-handler";
import { JsonModeChunk } from "./validator";

// 文本块大小限制
const MAX_TEXT_CHUNK_SIZE = 1000;

// 保存每个请求的解析状态
const requestParseState: Record<string, any> = {};
const requestChunkCount: Record<string, number> = {};

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
 * 流式JSON解析函数，尝试解析不完整的JSON字符串
 * @param chunk 当前接收到的JSON片段
 * @param previousResult 之前已解析的结果
 * @returns 当前部分解析结果
 */
function parsePartialJson(chunk: string, previousResult: any = {}): any {
  // 创建用于保存当前解析结果的对象
  const result = { ...previousResult };

  // 尝试解析context部分
  tryParseContext(chunk, result);

  // 尝试解析dictionary部分
  tryParseDictionary(chunk, result);

  return result;
}

// 尝试解析context部分
function tryParseContext(chunk: string, result: any): void {
  // 查找context部分的特征
  const contextMatch = /"context"\s*:\s*{([^}]*)/.exec(chunk);
  if (contextMatch) {
    // 提取context内部内容
    const contextContent = contextMatch[1];

    // 解析word_translation
    const wordTransMatch = /"word_translation"\s*:\s*"([^"]*)"/.exec(
      contextContent
    );
    if (wordTransMatch) {
      result.context = result.context || {};
      result.context.word_translation = wordTransMatch[1];
    }

    // 解析explanation
    const explanationMatch = /"explanation"\s*:\s*"([^"]*)"/.exec(
      contextContent
    );
    if (explanationMatch) {
      result.context = result.context || {};
      result.context.explanation = explanationMatch[1];
    }
  }
}

// 尝试解析dictionary部分
function tryParseDictionary(chunk: string, result: any): void {
  // 提取dictionary部分
  const dictMatch = /"dictionary"\s*:\s*{([^}]*)/.exec(chunk);
  if (dictMatch) {
    result.dictionary = result.dictionary || {};

    // 解析word和phonetic
    const wordMatch = /"word"\s*:\s*"([^"]*)"/.exec(chunk);
    if (wordMatch) {
      result.dictionary.word = wordMatch[1];
    }

    const phoneticMatch = /"phonetic"\s*:\s*"([^"]*)"/.exec(chunk);
    if (phoneticMatch) {
      result.dictionary.phonetic = phoneticMatch[1];
    }

    // 尝试解析definitions数组
    tryParseDefinitions(chunk, result);
  }
}

// 尝试解析definitions数组
function tryParseDefinitions(chunk: string, result: any): void {
  // 使用简单的正则来尝试提取各个definition项
  const defMatches = chunk.match(/{[^{]*"pos"\s*:\s*"[^"]*"[^}]*}/g);
  if (defMatches) {
    result.dictionary.definitions = result.dictionary.definitions || [];

    // 处理每个匹配到的definition
    defMatches.forEach((defStr) => {
      try {
        // 尝试解析这个完整的definition对象
        const defObj = JSON.parse(defStr);
        // 检查是否已存在该定义
        const exists = result.dictionary.definitions.some(
          (d: any) => d.pos === defObj.pos && d.def === defObj.def
        );
        if (!exists) {
          result.dictionary.definitions.push(defObj);
        }
      } catch (e) {
        // 忽略解析错误，继续处理
      }
    });
  }
}

// 判断JSON是否完整
function isCompleteJson(jsonStr: string): boolean {
  try {
    JSON.parse(jsonStr);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 处理JSON模式数据
 * 实现流式解析和渲染
 */
export async function processJsonModeData(
  content: any,
  requestId: string,
  tabId: number
) {
  console.log(`[Background] JSON模式，处理流式数据: ${requestId}`);

  try {
    // 确保content是字符串
    const jsonContent =
      typeof content === "string" ? content : JSON.stringify(content);

    // 初始化或增加块计数
    requestChunkCount[requestId] = (requestChunkCount[requestId] || 0) + 1;
    const chunkIndex = requestChunkCount[requestId];

    // 获取之前的解析结果，并用新数据更新
    const previousResult = requestParseState[requestId] || {};
    const partialResult = parsePartialJson(jsonContent, previousResult);

    // 保存当前解析结果
    requestParseState[requestId] = partialResult;

    // 尝试判断是否为完整JSON
    const isComplete = isCompleteJson(jsonContent);

    console.log(
      `[Background] 部分解析结果: ${JSON.stringify(partialResult).substring(
        0,
        100
      )}...`
    );

    // 发送部分解析结果到前端
    await chrome.tabs.sendMessage(tabId, {
      type: "SSE_CHUNK",
      requestId,
      data: {
        json: partialResult,
        isJsonMode: true,
        isPartial: !isComplete,
        chunkIndex,
      },
    });

    // 如果解析完成，发送完成消息
    if (isComplete) {
      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_JSON_COMPLETE",
        requestId,
        data: { totalChunks: chunkIndex },
      });

      // 清理该请求的状态
      delete requestParseState[requestId];
      delete requestChunkCount[requestId];
    }
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
