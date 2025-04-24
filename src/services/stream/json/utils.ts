/**
 * JSON 流处理工具函数
 */

/**
 * 判断JSON是否完整
 * @param jsonStr JSON字符串
 * @returns 是否完整
 */
export function isCompleteJson(jsonStr: string): boolean {
  try {
    JSON.parse(jsonStr);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 预处理JSON字符串
 * 移除字符串外的空白字符，保留字符串内的所有字符
 * @param content JSON内容
 * @param isInString 是否在字符串内
 * @param previousChar 前一个字符
 * @returns [处理后的内容, 新的isInString状态, 新的previousChar]
 */
export function preprocessJsonContent(
  content: string,
  isInString: boolean,
  previousChar: string | null
): [string, boolean, string | null] {
  let processedContent = "";
  let currentIsInString = isInString;
  let currentPrevChar = previousChar;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    let keepChar = false;

    if (char === '"' && currentPrevChar !== "\\") {
      // 在非转义引号处切换字符串状态
      currentIsInString = !currentIsInString;
      keepChar = true; // 保留引号
    } else if (currentIsInString) {
      // 在字符串内保留所有字符
      keepChar = true;
    } else {
      // 在字符串外只保留非空白字符
      if (!/\s/.test(char)) {
        keepChar = true;
      }
    }

    if (keepChar) {
      processedContent += char;
    }
    currentPrevChar = char; // 更新前一个字符，用于检测转义
  }

  return [processedContent, currentIsInString, currentPrevChar];
}
