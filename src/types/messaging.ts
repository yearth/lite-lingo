// --- 操作类型常量 ---

// UI -> Background (Requests)
export const MSG_TYPE_QUERY_FETCH_NOTEBOOK = "QUERY_FETCH_NOTEBOOK";
export const MSG_TYPE_MUTATION_ADD_WORD = "MUTATION_ADD_WORD";
export const MSG_TYPE_MUTATION_REQUEST_TTS = "MUTATION_REQUEST_TTS";
export const MSG_TYPE_MUTATION_TRANSLATE_STREAM = "MUTATION_TRANSLATE_STREAM"; // Renamed for clarity

// Background -> Content Script (Stream updates via chrome.tabs.sendMessage)
export const MSG_TYPE_STREAM_CHUNK = "STREAM_CHUNK";
export const MSG_TYPE_STREAM_ERROR = "STREAM_ERROR";
export const MSG_TYPE_STREAM_COMPLETE = "STREAM_COMPLETE";

// --- 消息结构 ---

// UI -> Background (via chrome.runtime.sendMessage)
export interface BackgroundRequestMessage<P = any> {
  type: string; // e.g., MSG_TYPE_MUTATION_ADD_WORD
  payload: P;
}

// Background -> UI (Response to chrome.runtime.sendMessage)
export interface BackgroundResponseMessage<T = any> {
  success: boolean;
  data?: T;
  error?: string; // 错误信息字符串
}

// Background -> Content Script (via chrome.tabs.sendMessage for stream updates)
export interface ContentScriptStreamMessage<P = any> {
  type:
    | typeof MSG_TYPE_STREAM_CHUNK
    | typeof MSG_TYPE_STREAM_ERROR
    | typeof MSG_TYPE_STREAM_COMPLETE;
  payload: P;
}

// --- 具体 Payload 接口 ---

// 获取单词本列表 (无特定 payload)
// 使用 BackgroundRequestMessage<void> 或 BackgroundRequestMessage<null>

// 添加单词到笔记本
export interface AddWordPayload {
  word: string;
  translation: string;
  context?: string;
  // 其他需要的字段...
}

// 请求 TTS
export interface RequestTtsPayload {
  text: string;
  language: "en" | "zh"; // 假设支持的语言
  // 其他 TTS 选项...
}

// 启动翻译流
export interface TranslateStreamPayload {
  text: string;
  context?: string;
  targetLanguage: string;
  // Note: tabId is automatically available in background via sender.tab.id
}

// 流式数据块
export interface StreamChunkPayload {
  chunk: string;
}

// 流式错误
export interface StreamErrorPayload {
  error: string;
}

// 流式完成 (无特定 payload)
// 使用 ContentScriptStreamMessage<void> 或 ContentScriptStreamMessage<null>

// --- 响应数据类型示例 (for BackgroundResponseMessage) ---

// 单词本列表的数据类型 (你需要根据实际情况定义)
export interface YourWordType {
  id: string;
  word: string;
  translation: string;
  context?: string;
  createdAt: string;
  // ...
}

// TTS 请求成功时的数据类型 (可能只是一个确认，或音频 URL/Blob ID)
// 假设返回音频 Blob 的 Object URL 或指示成功
export interface TtsSuccessData {
  audioUrl?: string; // 或者 boolean,或者无 data
  message?: string; // e.g., "Speech synthesis started"
}

// 添加单词成功的响应数据 (可能只是新单词的 ID 或确认)
export interface AddWordSuccessData {
  newWordId: string; // 示例
}

// --- 类型守卫 (Type Guards) ---
// 可选，但有助于在 onMessage 监听器中区分消息类型

export function isStreamChunkMessage(
  msg: any
): msg is ContentScriptStreamMessage<StreamChunkPayload> {
  return (
    msg &&
    msg.type === MSG_TYPE_STREAM_CHUNK &&
    typeof msg.payload?.chunk === "string"
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
): msg is ContentScriptStreamMessage<void> {
  return msg && msg.type === MSG_TYPE_STREAM_COMPLETE;
}
