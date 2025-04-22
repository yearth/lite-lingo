import { handleStreamError } from "./error-handler";
import { JsonModeChunk } from "./validator";

// 文本块大小限制
const MAX_TEXT_CHUNK_SIZE = 1000;

// 保存每个请求的解析状态
const requestParseState: Record<string, any> = {};
const requestChunkCount: Record<string, number> = {};
// 为每个请求维护一个JSON字符串缓冲区
const requestJsonBuffer: Record<string, string> = {};

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
  console.log(
    "[Parser] 开始解析JSON片段:",
    chunk.substring(0, 50) + (chunk.length > 50 ? "..." : "")
  );
  console.log(
    "[Parser] 之前的解析结果:",
    JSON.stringify(previousResult).substring(0, 100) + "..."
  );

  // 创建用于保存当前解析结果的对象
  const result = { ...previousResult };

  // 尝试解析context部分
  tryParseContext(chunk, result);

  // 尝试解析dictionary部分
  tryParseDictionary(chunk, result);

  console.log(
    "[Parser] 当前解析结果:",
    JSON.stringify(result).substring(0, 100) + "..."
  );
  return result;
}

// 尝试解析context部分
function tryParseContext(chunk: string, result: any): void {
  // 查找context部分的特征
  const contextMatch = /"context"\s*:\s*{([^}]*)/.exec(chunk);
  console.log(
    "[Parser] Context匹配结果:",
    contextMatch ? "找到匹配" : "未找到匹配"
  );

  if (contextMatch) {
    // 提取context内部内容
    const contextContent = contextMatch[1];
    console.log("[Parser] Context内容:", contextContent);

    // 解析word_translation
    const wordTransMatch = /"word_translation"\s*:\s*"([^"]*)"/.exec(
      contextContent
    );
    console.log(
      "[Parser] word_translation匹配:",
      wordTransMatch ? "找到匹配" : "未找到匹配"
    );

    if (wordTransMatch) {
      result.context = result.context || {};
      result.context.word_translation = wordTransMatch[1];
      console.log("[Parser] 设置word_translation:", wordTransMatch[1]);
    }

    // 解析explanation
    const explanationMatch = /"explanation"\s*:\s*"([^"]*)"/.exec(
      contextContent
    );
    console.log(
      "[Parser] explanation匹配:",
      explanationMatch ? "找到匹配" : "未找到匹配"
    );

    if (explanationMatch) {
      result.context = result.context || {};
      result.context.explanation = explanationMatch[1];
      console.log(
        "[Parser] 设置explanation:",
        explanationMatch[1].substring(0, 30) + "..."
      );
    }
  }
}

// 尝试解析dictionary部分
function tryParseDictionary(chunk: string, result: any): void {
  // 提取dictionary部分
  const dictMatch = /"dictionary"\s*:\s*{([^}]*)/.exec(chunk);
  console.log(
    "[Parser] Dictionary匹配结果:",
    dictMatch ? "找到匹配" : "未找到匹配"
  );

  if (dictMatch) {
    result.dictionary = result.dictionary || {};
    console.log(
      "[Parser] Dictionary内容:",
      dictMatch[1].substring(0, 50) + "..."
    );

    // 解析word和phonetic
    const wordMatch = /"word"\s*:\s*"([^"]*)"/.exec(chunk);
    console.log("[Parser] word匹配:", wordMatch ? "找到匹配" : "未找到匹配");

    if (wordMatch) {
      result.dictionary.word = wordMatch[1];
      console.log("[Parser] 设置word:", wordMatch[1]);
    }

    const phoneticMatch = /"phonetic"\s*:\s*"([^"]*)"/.exec(chunk);
    console.log(
      "[Parser] phonetic匹配:",
      phoneticMatch ? "找到匹配" : "未找到匹配"
    );

    if (phoneticMatch) {
      result.dictionary.phonetic = phoneticMatch[1];
      console.log("[Parser] 设置phonetic:", phoneticMatch[1]);
    }

    // 尝试解析definitions数组
    tryParseDefinitions(chunk, result);
  }
}

// 尝试解析definitions数组
function tryParseDefinitions(chunk: string, result: any): void {
  console.log("[Parser] 开始解析definitions数组...");

  // 检查definitions标志
  if (!hasDefinitionsArray(chunk)) return;

  // 准备definitions数组
  result.dictionary = result.dictionary || {};
  result.dictionary.definitions = result.dictionary.definitions || [];
  const oldCount = result.dictionary.definitions.length;
  console.log(`[Parser] 当前definitions数组长度: ${oldCount}`);

  try {
    // 提取所有definition项
    const definitions = extractDefinitions(chunk);

    // 添加到结果中
    definitions.forEach((def) => {
      if (!isDuplicateDefinition(result.dictionary.definitions, def)) {
        result.dictionary.definitions.push(def);
        console.log(`[Parser] 添加新定义: ${JSON.stringify(def)}`);
      } else {
        console.log(`[Parser] 忽略重复定义: ${JSON.stringify(def)}`);
      }
    });
  } catch (error) {
    console.error(`[Parser] 解析definitions过程中出错:`, error);
  }

  console.log(
    `[Parser] 定义项更新: 从${oldCount}个增加到${result.dictionary.definitions.length}个`
  );
  if (result.dictionary.definitions.length > 0) {
    console.log(
      `[Parser] 最终definitions数组内容: ${JSON.stringify(
        result.dictionary.definitions
      )}`
    );
  }
}

// 检查是否存在definitions数组
function hasDefinitionsArray(chunk: string): boolean {
  const defsMatch = /"definitions"\s*:\s*\[/.exec(chunk);
  console.log("[Parser] Definitions数组标志:", defsMatch ? "找到" : "未找到");

  if (!defsMatch) {
    console.log("[Parser] 未找到definitions数组标志，跳过解析");
    return false;
  }
  return true;
}

// 提取所有definition项
function extractDefinitions(chunk: string): any[] {
  const definitions: any[] = [];

  // 查找所有pos字段
  const posMatches = chunk.match(/"pos"\s*:\s*"([^"]*)"/g);
  console.log("[Parser] 找到pos字段数量:", posMatches ? posMatches.length : 0);

  if (!posMatches) {
    console.log("[Parser] 未找到任何pos字段，跳过解析");
    return definitions;
  }

  // 遍历每个pos匹配项，提取完整定义
  for (let i = 0; i < posMatches.length; i++) {
    try {
      const posMatch = /"pos"\s*:\s*"([^"]*)"/.exec(posMatches[i]);
      if (!posMatch) continue;

      const pos = posMatch[1];
      console.log(`[Parser] 处理pos='${pos}'的定义`);

      // 尝试构建完整的definition对象
      const definition = buildDefinitionObject(chunk, pos);
      if (definition) {
        definitions.push(definition);
      }
    } catch (error) {
      console.error(`[Parser] 提取definition时出错:`, error);
    }
  }

  console.log(`[Parser] 成功提取${definitions.length}个definition对象`);
  return definitions;
}

// 构建完整的definition对象
function buildDefinitionObject(chunk: string, pos: string): any | null {
  // 查找与特定pos关联的def
  const defRegex = new RegExp(
    `"pos"\\s*:\\s*"${pos}"[^}]*"def"\\s*:\\s*"([^"]*)"`,
    "i"
  );
  const defMatch = defRegex.exec(chunk);

  if (!defMatch) {
    console.log(`[Parser] 未找到pos='${pos}'的def字段`);
    return null;
  }

  const def = defMatch[1];
  console.log(`[Parser] 找到定义: pos=${pos}, def=${def}`);

  // 创建基本definition对象
  const definition: any = { pos, def };

  // 专门提取example
  const example = extractExample(chunk, pos, def);
  if (example) {
    definition.example = example;
    console.log(`[Parser] 为定义添加example: ${JSON.stringify(example)}`);
  } else {
    console.log(`[Parser] 未找到该定义的example`);
  }

  return definition;
}

// 专门提取example对象
function extractExample(chunk: string, pos: string, def: string): any | null {
  console.log(`[Parser] 尝试提取pos='${pos}', def='${def}'的example`);

  try {
    // 准备安全的转义版本，用于正则
    const escapedPos = pos.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedDef = def.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 方法1: 使用完整匹配模式
    console.log("[Parser] 尝试使用完整匹配模式提取example");
    const fullPattern = new RegExp(
      `\\{[^{]*"pos"\\s*:\\s*"${escapedPos}"[^{]*"def"\\s*:\\s*"${escapedDef}"[^}]*"example"\\s*:\\s*\\{[^}]*"orig"\\s*:\\s*"(.*?)"[^}]*"trans"\\s*:\\s*"(.*?)"[^}]*\\}`,
      "i"
    );

    const fullMatch = fullPattern.exec(chunk);
    if (fullMatch && fullMatch.length >= 3) {
      console.log("[Parser] 完整匹配成功");
      // 打印提取的内容以进行调试
      console.log(`[Parser] 提取到的orig: "${fullMatch[1]}"`);
      console.log(`[Parser] 提取到的trans: "${fullMatch[2]}"`);
      return {
        orig: fullMatch[1],
        trans: fullMatch[2],
      };
    }

    // 方法2: 查找example对象并提取内容
    console.log("[Parser] 尝试分段提取example");

    // 定位到example对象的开始位置
    const exampleStartPattern = new RegExp(
      `"pos"\\s*:\\s*"${escapedPos}"[^}]*"def"\\s*:\\s*"${escapedDef}"[^}]*"example"\\s*:\\s*\\{`,
      "i"
    );
    const exampleStartMatch = exampleStartPattern.exec(chunk);

    if (!exampleStartMatch) {
      console.log("[Parser] 未找到example对象开始标记");
      return null;
    }

    const startPos = exampleStartMatch.index + exampleStartMatch[0].length;
    console.log(`[Parser] example对象起始位置: ${startPos}`);

    // 从startPos开始，找到匹配的结束括号
    let bracketCount = 1;
    let endPos = -1;

    for (let i = startPos; i < chunk.length; i++) {
      if (chunk[i] === "{") bracketCount++;
      else if (chunk[i] === "}") bracketCount--;

      if (bracketCount === 0) {
        endPos = i;
        break;
      }
    }

    if (endPos === -1) {
      console.log("[Parser] 未找到example对象的结束括号");
      return null;
    }

    // 提取example内容
    const exampleContent = chunk.substring(startPos, endPos);
    console.log(`[Parser] 提取到example内容: ${exampleContent}`);

    // 使用更可靠的方式提取orig和trans
    // 使用索引方法而不是正则表达式，避免空格问题
    let origValue = null;
    let transValue = null;

    // 找到"orig"标记
    const origIndex = exampleContent.indexOf('"orig"');
    if (origIndex !== -1) {
      // 找到冒号和第一个引号
      const origValueStart = exampleContent.indexOf(":", origIndex) + 1;
      const origQuoteStart = exampleContent.indexOf('"', origValueStart);

      if (origQuoteStart !== -1) {
        // 找到闭合引号，需要处理可能的转义引号
        let endQuotePos = origQuoteStart + 1;
        while (endQuotePos < exampleContent.length) {
          if (
            exampleContent[endQuotePos] === '"' &&
            exampleContent[endQuotePos - 1] !== "\\"
          ) {
            break;
          }
          endQuotePos++;
        }

        if (endQuotePos < exampleContent.length) {
          origValue = exampleContent.substring(origQuoteStart + 1, endQuotePos);
          console.log(`[Parser] 找到orig值: "${origValue}"`);
        }
      }
    }

    // 找到"trans"标记
    const transIndex = exampleContent.indexOf('"trans"');
    if (transIndex !== -1) {
      // 找到冒号和第一个引号
      const transValueStart = exampleContent.indexOf(":", transIndex) + 1;
      const transQuoteStart = exampleContent.indexOf('"', transValueStart);

      if (transQuoteStart !== -1) {
        // 找到闭合引号，需要处理可能的转义引号
        let endQuotePos = transQuoteStart + 1;
        while (endQuotePos < exampleContent.length) {
          if (
            exampleContent[endQuotePos] === '"' &&
            exampleContent[endQuotePos - 1] !== "\\"
          ) {
            break;
          }
          endQuotePos++;
        }

        if (endQuotePos < exampleContent.length) {
          transValue = exampleContent.substring(
            transQuoteStart + 1,
            endQuotePos
          );
          console.log(`[Parser] 找到trans值: "${transValue}"`);
        }
      }
    }

    if (origValue && transValue) {
      return {
        orig: origValue,
        trans: transValue,
      };
    }

    // 如果上面的方法失败，尝试使用更宽松的正则表达式
    console.log("[Parser] 尝试使用备选正则提取orig和trans");
    const origMatch = /"orig"\s*:\s*"(.*?)(?<!\\)"/.exec(exampleContent);
    const transMatch = /"trans"\s*:\s*"(.*?)(?<!\\)"/.exec(exampleContent);

    if (origMatch && transMatch) {
      console.log(`[Parser] 备选正则提取到的orig: "${origMatch[1]}"`);
      console.log(`[Parser] 备选正则提取到的trans: "${transMatch[1]}"`);
      return {
        orig: origMatch[1],
        trans: transMatch[1],
      };
    }

    console.log("[Parser] 无法从example内容中提取orig或trans");
    return null;
  } catch (error) {
    console.error(`[Parser] 提取example时出错:`, error);
    return null;
  }
}

// 检查是否为重复definition
function isDuplicateDefinition(existingDefs: any[], newDef: any): boolean {
  const isDuplicate = existingDefs.some(
    (d) => d.pos === newDef.pos && d.def === newDef.def
  );
  if (isDuplicate) {
    console.log(`[Parser] 发现重复定义: pos=${newDef.pos}, def=${newDef.def}`);
  }
  return isDuplicate;
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
    console.log(
      `[Background] 原始JSON内容(前100字符): ${jsonContent.substring(
        0,
        100
      )}...`
    );

    // 累积JSON片段到缓冲区
    requestJsonBuffer[requestId] = requestJsonBuffer[requestId] || "";
    requestJsonBuffer[requestId] += jsonContent;
    const accumulatedJson = requestJsonBuffer[requestId];
    console.log(
      `[Background] 累积的JSON(长度:${
        accumulatedJson.length
      }): ${accumulatedJson.substring(0, 100)}...`
    );

    // 初始化或增加块计数
    requestChunkCount[requestId] = (requestChunkCount[requestId] || 0) + 1;
    const chunkIndex = requestChunkCount[requestId];
    console.log(`[Background] 处理第${chunkIndex}个JSON数据块`);

    // 获取之前的解析结果，并用累积的JSON更新
    const previousResult = requestParseState[requestId] || {};
    console.log(
      `[Background] 之前的解析状态: ${JSON.stringify(previousResult).substring(
        0,
        100
      )}...`
    );

    const partialResult = parsePartialJson(accumulatedJson, previousResult);

    // 保存当前解析结果
    requestParseState[requestId] = partialResult;

    // 尝试判断是否为完整JSON
    const isComplete = isCompleteJson(accumulatedJson);
    console.log(`[Background] 是否完整JSON: ${isComplete}`);

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
    console.log(`[Background] 已发送JSON数据块${chunkIndex}到前端`);

    // 如果解析完成，发送完成消息
    if (isComplete) {
      console.log(`[Background] JSON完整，发送完成消息`);

      // 打印完整的JSON和解析结果，用于调试
      console.log(`[Background] 完整的原始JSON: ${accumulatedJson}`);
      console.log(
        `[Background] 完整的解析结果JSON: ${JSON.stringify(
          partialResult,
          null,
          2
        )}`
      );

      // 尝试将完整JSON解析为对象并与我们的解析结果比较
      try {
        const standardParsed = JSON.parse(accumulatedJson);
        console.log(
          `[Background] 标准JSON.parse结果: ${JSON.stringify(
            standardParsed,
            null,
            2
          )}`
        );

        // 比较关键字段
        if (standardParsed.context) {
          console.log(
            `[Background] 标准解析-context: ${JSON.stringify(
              standardParsed.context
            )}`
          );
          console.log(
            `[Background] 自定义解析-context: ${JSON.stringify(
              partialResult.context
            )}`
          );
        }

        if (standardParsed.dictionary) {
          console.log(
            `[Background] 标准解析-dictionary字段数: ${
              Object.keys(standardParsed.dictionary).length
            }`
          );
          console.log(
            `[Background] 自定义解析-dictionary字段数: ${
              partialResult.dictionary
                ? Object.keys(partialResult.dictionary).length
                : 0
            }`
          );

          if (standardParsed.dictionary.definitions) {
            console.log(
              `[Background] 标准解析-definitions数量: ${standardParsed.dictionary.definitions.length}`
            );
            console.log(
              `[Background] 自定义解析-definitions数量: ${
                partialResult.dictionary?.definitions?.length || 0
              }`
            );
          }
        }
      } catch (parseError) {
        console.error(`[Background] 标准JSON.parse出错:`, parseError);
      }

      await chrome.tabs.sendMessage(tabId, {
        type: "SSE_JSON_COMPLETE",
        requestId,
        data: { totalChunks: chunkIndex },
      });

      // 清理该请求的状态
      delete requestParseState[requestId];
      delete requestChunkCount[requestId];
      delete requestJsonBuffer[requestId]; // 清理JSON缓冲区
      console.log(`[Background] 已清理请求${requestId}的状态`);
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
