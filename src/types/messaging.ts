// --- 操作类型常量 ---

// UI -> Background (Requests)
export const MSG_TYPE_QUERY_FETCH_NOTEBOOK = "QUERY_FETCH_NOTEBOOK";
export const MSG_TYPE_MUTATION_ADD_WORD = "MUTATION_ADD_WORD";
export const MSG_TYPE_MUTATION_REQUEST_TTS = "MUTATION_REQUEST_TTS";
export const MSG_TYPE_MUTATION_TRANSLATE_STREAM = "MUTATION_TRANSLATE_STREAM";

// Background -> Content Script (Stream updates via chrome.tabs.sendMessage)
// export const MSG_TYPE_STREAM_CHUNK = "STREAM_CHUNK"; // Superseded by STREAM_EVENT
export const MSG_TYPE_STREAM_EVENT = "STREAM_EVENT"; // New type for structured events
export const MSG_TYPE_STREAM_ERROR = "STREAM_ERROR"; // For connection or top-level API errors
export const MSG_TYPE_STREAM_COMPLETE = "STREAM_COMPLETE"; // Sent when 'done' event is received

// --- 消息结构 ---

// UI -> Background (via chrome.runtime.sendMessage)
export interface BackgroundRequestMessage<P = any> {
  type: string; // e.g., MSG_TYPE_MUTATION_ADD_WORD
  payload: P;
}

// Background -> UI (Response to chrome.runtime.sendMessage - for initial request ack/error)
export interface BackgroundResponseMessage<T = any> {
  success: boolean;
  data?: T;
  error?: string; // 错误信息字符串
}

// Background -> Content Script (via chrome.tabs.sendMessage for stream updates)
// Represents messages sent from background *during* the stream
export interface ContentScriptStreamMessage<P = any> {
  type:
    | typeof MSG_TYPE_STREAM_EVENT // Contains StreamEventPayload
    | typeof MSG_TYPE_STREAM_ERROR // Contains StreamErrorPayload
    | typeof MSG_TYPE_STREAM_COMPLETE; // Contains void/null or status info
  payload: P;
}

// --- SSE Stream Event Payload (Mirrors backend structure from translate.md) ---
export interface StreamEventPayload<P = any> {
  /**
   * 事件类型 (由 AI 生成或后端添加):
   * 'analysis_info', 'context_explanation', 'dictionary_start', 'definition',
   * 'example', 'dictionary_end', 'translation_result', 'fragment_error',
   * 'parsing_error', 'error', 'done'
   */
  type: string;
  /**
   * 事件的具体数据负载，结构取决于 type。
   */
  payload: P;
}

// --- 具体 Payload 接口 ---

// 获取单词本列表 (无特定 payload)

// 添加单词到笔记本
export interface AddWordPayload {
  word: string;
  translation: string;
  context?: string;
}

// 请求 TTS
export interface RequestTtsPayload {
  text: string;
  language: "en" | "zh";
}

// 启动翻译流
export interface TranslateStreamPayload {
  text: string;
  context?: string;
  targetLanguage: string;
}

// // 流式数据块 - Superseded by StreamEventPayload with type 'text_chunk'
// export interface StreamChunkPayload {
//   chunk: string;
// }

// 流式错误 (for connection/processing errors sent via MSG_TYPE_STREAM_ERROR)
export interface StreamErrorPayload {
  error: string;
}

// 流式完成 (Payload for MSG_TYPE_STREAM_COMPLETE, could contain final status)
export interface StreamCompletePayload {
  status: "completed" | "failed"; // Reflects the status from the 'done' event
}

// --- 响应数据类型示例 (for BackgroundResponseMessage) ---

// 单词本列表的数据类型
export interface YourWordType {
  id: string;
  word: string;
  translation: string;
  context?: string;
  createdAt: string;
}

// TTS 请求成功时的数据类型
export interface TtsSuccessData {
  message?: string; // e.g., "TTS initiated"
}

// 添加单词成功的响应数据
export interface AddWordSuccessData {
  newWordId: string;
}

// --- 类型守卫 (Type Guards) ---

// export function isStreamChunkMessage( // Removed
//   msg: any
// ): msg is ContentScriptStreamMessage<StreamChunkPayload> {
//   return (
//     msg &&
//     msg.type === MSG_TYPE_STREAM_CHUNK &&
//     typeof msg.payload?.chunk === "string"
//   );
// }

export function isStreamEventMessage(
  msg: any
): msg is ContentScriptStreamMessage<StreamEventPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_STREAM_EVENT &&
    typeof msg.payload?.type === "string" && // Check for inner type property
    msg.payload?.payload !== undefined // Check for inner payload property
  );
}

export function isStreamErrorMessage(
  msg: any
): msg is ContentScriptStreamMessage<StreamErrorPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_STREAM_ERROR &&
    typeof msg.payload?.error === "string"
  );
}

export function isStreamCompleteMessage(
  msg: any
): msg is ContentScriptStreamMessage<StreamCompletePayload> {
  // Check payload status for completeness
  return (
    msg &&
    msg.type === MSG_TYPE_STREAM_COMPLETE &&
    typeof msg.payload?.status === "string"
  );
}
