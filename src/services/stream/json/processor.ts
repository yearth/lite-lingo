/**
 * JSON 模式数据处理器
 */
import { handleStreamError } from "../error-handler";
import { parsePartialJson } from "./parser";
import {
  appendJsonBuffer,
  incrementChunkCount,
  updateParseState,
  updatePreprocessState,
} from "./state/functions";
import { clearState, getState, updateState } from "./state/store";
import { isCompleteJson, preprocessJsonContent } from "./utils";

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

    // --- 预处理逻辑 ---
    const state = getState(requestId);
    const [processedChunk, isInString, previousChar] = preprocessJsonContent(
      jsonContent,
      state.preprocessState.isInString,
      state.preprocessState.previousChar
    );

    // 更新预处理状态
    updateState(requestId, (currentState) =>
      updatePreprocessState(currentState, { isInString, previousChar })
    );

    console.log(
      `[Background] 预处理后Chunk(前100字符): ${processedChunk.substring(
        0,
        100
      )}...`
    );

    // 累积预处理后的JSON片段到缓冲区
    updateState(requestId, (currentState) =>
      appendJsonBuffer(currentState, processedChunk)
    );

    // 获取更新后的状态
    const updatedState = getState(requestId);
    const accumulatedJson = updatedState.jsonBuffer;

    console.log(
      `[Background] 累积的预处理后JSON(长度:${
        accumulatedJson.length
      }): ${accumulatedJson.substring(0, 100)}...`
    );

    // 增加块计数
    updateState(requestId, incrementChunkCount);
    const newState = getState(requestId);
    const chunkIndex = newState.chunkCount;

    console.log(`[Background] 处理第${chunkIndex}个JSON数据块`);

    // 解析部分JSON
    const partialResult = parsePartialJson(
      accumulatedJson,
      newState.parseState
    );

    // 保存当前解析结果
    updateState(requestId, (currentState) =>
      updateParseState(currentState, partialResult)
    );

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
      console.log(`[Background] 完整的预处理后JSON: ${accumulatedJson}`);
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
      clearState(requestId);
      console.log(`[Background] 已清理请求${requestId}的状态`);
    }
  } catch (error) {
    console.error(`[Background] 处理JSON数据失败: ${requestId}`, error);
    handleStreamError(error, requestId, tabId);
  }
}
