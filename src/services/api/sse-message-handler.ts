import {
  createTranslationParser,
  processTranslationStream,
} from "../parser/streaming-parser";
import { ParsedSectionKey } from "../parser/types";

export interface SSEMessageHandlerConfig {
  onData: (section: ParsedSectionKey, data: any) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export const createSSEMessageHandler = (config: SSEMessageHandlerConfig) => {
  console.log("[ SSE Handler ] 创建SSE消息处理器");
  const parser = createTranslationParser();

  // 包装回调函数以添加日志
  const onDataWithLogging = (section: ParsedSectionKey, data: any) => {
    console.log(`[ SSE Handler ] 解析出数据，section: ${section}`, data);
    config.onData(section, data);
  };

  const processStream = processTranslationStream(parser, onDataWithLogging);

  return {
    handleChunk: (chunk: string) => {
      console.log(`[ SSE Handler ] 收到新chunk，长度: ${chunk.length}`);
      console.log(
        "[ SSE Handler ] Chunk内容(截取前100字符):",
        chunk.substring(0, 100) + (chunk.length > 100 ? "..." : "")
      );

      try {
        const done = processStream(chunk);
        console.log(`[ SSE Handler ] 处理chunk完成，done标记: ${done}`);

        if (done) {
          console.log("[ SSE Handler ] 检测到处理完成，调用onComplete回调");
          config.onComplete();
        }
      } catch (error) {
        console.error("[ SSE Handler ] 处理chunk时发生错误:", error);
        config.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },
    handleError: (error: Error) => {
      console.error("[ SSE Handler ] 处理错误事件:", error.message);
      config.onError(error);
    },
  };
};
