/**
 * 词典定义解析器
 * 处理流式 JSON 中的 definitions 数组
 */

/**
 * 检查是否存在definitions数组
 */
export function hasDefinitionsArray(chunk: string): boolean {
  const defsMatch = /"definitions"\s*:\s*\[/.exec(chunk);
  console.log("[Parser] Definitions数组标志:", defsMatch ? "找到" : "未找到");

  if (!defsMatch) {
    console.log("[Parser] 未找到definitions数组标志，跳过解析");
    return false;
  }
  return true;
}

/**
 * 尝试解析definitions数组
 */
export function tryParseDefinitions(chunk: string, result: any): void {
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

/**
 * 提取所有definition项
 */
export function extractDefinitions(chunk: string): any[] {
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

/**
 * 构建完整的definition对象
 */
export function buildDefinitionObject(chunk: string, pos: string): any | null {
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

/**
 * 专门提取example对象
 */
export function extractExample(
  chunk: string,
  pos: string,
  def: string
): any | null {
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

    // 分别提取orig和trans值
    return extractOrigAndTrans(exampleContent);
  } catch (error) {
    console.error(`[Parser] 提取example时出错:`, error);
    return null;
  }
}

/**
 * 从example内容中提取orig和trans值
 */
function extractOrigAndTrans(exampleContent: string): any | null {
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
        transValue = exampleContent.substring(transQuoteStart + 1, endQuotePos);
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
}

/**
 * 检查是否为重复definition
 */
export function isDuplicateDefinition(
  existingDefs: any[],
  newDef: any
): boolean {
  const isDuplicate = existingDefs.some(
    (d) => d.pos === newDef.pos && d.def === newDef.def
  );
  if (isDuplicate) {
    console.log(`[Parser] 发现重复定义: pos=${newDef.pos}, def=${newDef.def}`);
  }
  return isDuplicate;
}
