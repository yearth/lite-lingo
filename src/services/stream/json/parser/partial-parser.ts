/**
 * 部分 JSON 解析器
 * 用于解析不完整的流式 JSON 数据
 */
import { tryParseDefinitions } from "./definition-parser";

/**
 * 流式JSON解析函数，尝试解析不完整的JSON字符串
 * @param chunk 当前接收到的JSON片段
 * @param previousResult 之前已解析的结果
 * @returns 当前部分解析结果
 */
export function parsePartialJson(chunk: string, previousResult: any = {}): any {
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

/**
 * 尝试解析context部分
 */
export function tryParseContext(chunk: string, result: any): void {
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

/**
 * 尝试解析dictionary部分
 */
export function tryParseDictionary(chunk: string, result: any): void {
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
