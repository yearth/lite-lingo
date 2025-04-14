// --- 操作类型常量 ---

// UI -> Background (Requests)
export const MSG_TYPE_QUERY_FETCH_NOTEBOOK = "QUERY_FETCH_NOTEBOOK";
export const MSG_TYPE_MUTATION_ADD_WORD = "MUTATION_ADD_WORD";
export const MSG_TYPE_MUTATION_REQUEST_TTS = "MUTATION_REQUEST_TTS";
export const MSG_TYPE_MUTATION_TRANSLATE_STREAM = "MUTATION_TRANSLATE_STREAM";
export const MSG_TYPE_MUTATION_CANCEL_TRANSLATION =
  "MUTATION_CANCEL_TRANSLATION";

// Background -> Content Script (Stream updates via chrome.tabs.sendMessage)
// V1 Types
export const MSG_TYPE_STREAM_EVENT = "STREAM_EVENT"; // V1: Contains structured StreamEventPayload
export const MSG_TYPE_STREAM_ERROR = "STREAM_ERROR"; // Common: For connection or top-level API errors
export const MSG_TYPE_STREAM_COMPLETE = "STREAM_COMPLETE"; // V1: Sent when 'done' event is received
// V2 Types
export const MSG_TYPE_ANALYSIS_INFO_RECEIVED = "ANALYSIS_INFO_RECEIVED"; // V2: Contains AnalysisInfoPayload
export const MSG_TYPE_SECTION_START = "SECTION_START"; // V2: New type for section start
export const MSG_TYPE_TEXT_CHUNK_RECEIVED = "TEXT_CHUNK_RECEIVED"; // V2: Contains TextChunkPayload
export const MSG_TYPE_SECTION_END = "SECTION_END"; // V2: New type for section end
export const MSG_TYPE_STREAM_DONE_V2 = "STREAM_DONE_V2"; // V2: Explicit done signal

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
// Represents messages sent from background *during* the stream (V1 or V2)
export interface ContentScriptStreamMessage<P = any> {
  type: // V1 Types
  | typeof MSG_TYPE_STREAM_EVENT
    | typeof MSG_TYPE_STREAM_COMPLETE
    // V2 Types
    | typeof MSG_TYPE_ANALYSIS_INFO_RECEIVED
    | typeof MSG_TYPE_SECTION_START // Add new type
    | typeof MSG_TYPE_TEXT_CHUNK_RECEIVED
    | typeof MSG_TYPE_SECTION_END // Add new type
    | typeof MSG_TYPE_STREAM_DONE_V2
    // Common Types
    | typeof MSG_TYPE_STREAM_ERROR;
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

// --- V2 Specific Payloads ---

// Payload for MSG_TYPE_ANALYSIS_INFO_RECEIVED (Mirrors backend structure)
export interface AnalysisInfoPayload {
  inputType: "word_or_phrase" | "sentence" | "fragment";
  sourceText: string;
}

// Payload for MSG_TYPE_TEXT_CHUNK_RECEIVED
export interface TextChunkPayload {
  text: string;
}

// Payload for MSG_TYPE_SECTION_START and MSG_TYPE_SECTION_END
export interface SectionBoundaryPayload {
  section: "EXPLANATION" | "CONTEXT_EXPLANATION" | "DICTIONARY" | string; // Allow known sections + string for flexibility
}

// --- V1 & Common Payload 接口 ---

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

// 取消翻译流
export interface CancelTranslationPayload {
  reason?: string; // 可选的取消原因
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

// --- V2 Type Guards ---

export function isAnalysisInfoMessage(
  msg: any
): msg is ContentScriptStreamMessage<AnalysisInfoPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_ANALYSIS_INFO_RECEIVED &&
    typeof msg.payload?.inputType === "string" &&
    typeof msg.payload?.sourceText === "string"
  );
}

export function isTextChunkMessage(
  msg: any
): msg is ContentScriptStreamMessage<TextChunkPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_TEXT_CHUNK_RECEIVED &&
    typeof msg.payload?.text === "string"
  );
}

// Type guard for V2 done message
export function isStreamDoneMessageV2(
  msg: any
): msg is ContentScriptStreamMessage<StreamCompletePayload> {
  // Reusing StreamCompletePayload for V2 done event
  return (
    msg &&
    msg.type === MSG_TYPE_STREAM_DONE_V2 &&
    typeof msg.payload?.status === "string" // Check for status property
  );
}

// Type guard for section start message
export function isSectionStartMessage(
  msg: any
): msg is ContentScriptStreamMessage<SectionBoundaryPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_SECTION_START &&
    typeof msg.payload?.section === "string"
  );
}

// Type guard for section end message
export function isSectionEndMessage(
  msg: any
): msg is ContentScriptStreamMessage<SectionBoundaryPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_SECTION_END &&
    typeof msg.payload?.section === "string"
  );
}
