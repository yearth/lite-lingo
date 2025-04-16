import { ParsedSectionKey, Parser, ParseResult } from "./types";

// 纯函数：解析特定section
const parseSection = (
  section: ParsedSectionKey,
  buffer: string
): ParseResult => {
  console.log(
    `[ Parser ] 尝试解析 ${section} 部分, 缓冲区长度: ${buffer.length}`
  );

  const match = buffer.match(new RegExp(`"${section}"\\s*:\\s*({[^}]+})`));
  if (!match) {
    console.log(`[ Parser ] ${section} 部分未找到匹配`);
    return { done: false, remainingBuffer: buffer };
  }

  try {
    console.log(
      `[ Parser ] ${section} 部分找到匹配:`,
      match[0].substring(0, 100) + (match[0].length > 100 ? "..." : "")
    );
    const data = JSON.parse(match[1]);
    console.log(`[ Parser ] ${section} 部分解析成功:`, data);
    return {
      section,
      data,
      done: false,
      remainingBuffer: buffer.slice(match[0].length),
    };
  } catch (e) {
    console.error(`[ Parser ] 解析 ${section} 失败:`, e);
    console.error(
      `[ Parser ] 失败的匹配内容:`,
      match[1].substring(0, 150) + (match[1].length > 150 ? "..." : "")
    );
    return { done: false, remainingBuffer: buffer };
  }
};

// 组合解析器
const createParser = (sections: ParsedSectionKey[]): Parser => {
  console.log(`[ Parser ] 创建解析器，sections:`, sections);
  return (buffer: string): ParseResult => {
    console.log(
      `[ Parser ] 开始解析, 缓冲区内容(截取前100字符):`,
      buffer.substring(0, 100) + (buffer.length > 100 ? "..." : "")
    );

    // 检查是否完成
    if (buffer.includes("[DONE]")) {
      console.log(`[ Parser ] 检测到 [DONE] 标记，解析完成`);
      return { done: true, remainingBuffer: buffer };
    }

    // 按优先级顺序尝试解析每个section
    for (const section of sections) {
      console.log(`[ Parser ] 开始尝试解析 ${section} 部分`);
      const result = parseSection(section, buffer);
      if (result.section) {
        console.log(
          `[ Parser ] ${section} 部分解析成功，剩余缓冲区长度: ${result.remainingBuffer.length}`
        );
        return result;
      }
    }

    console.log(`[ Parser ] 所有 sections 都未解析成功，保留缓冲区`);
    return { done: false, remainingBuffer: buffer };
  };
};

// 创建翻译解析器
export const createTranslationParser = () => {
  console.log(`[ Parser ] 创建翻译解析器`);
  const sections: ParsedSectionKey[] = [
    "analysisInfo",
    "context",
    "dictionary",
  ];
  return createParser(sections);
};

// 使用示例
export const processTranslationStream = (
  parser: Parser,
  onData: (section: ParsedSectionKey, data: any) => void
) => {
  console.log(`[ Parser ] 创建流处理器`);
  let buffer = "";

  return (chunk: string) => {
    console.log(
      `[ Parser ] 收到新 chunk, 长度: ${chunk.length}, 内容(截取前50字符):`,
      chunk.substring(0, 50) + (chunk.length > 50 ? "..." : "")
    );
    buffer += chunk;
    console.log(`[ Parser ] 当前缓冲区长度: ${buffer.length}`);

    const result = parser(buffer);

    if (result.section && result.data) {
      console.log(`[ Parser ] 解析出 ${result.section} 数据，回调处理`);
      onData(result.section, result.data);
    } else {
      console.log(`[ Parser ] 未解析出任何 section 数据`);
    }

    buffer = result.remainingBuffer;
    console.log(`[ Parser ] 更新缓冲区，新长度: ${buffer.length}`);

    if (result.done) {
      console.log(`[ Parser ] 解析完成标记: true`);
    }

    return result.done;
  };
};
