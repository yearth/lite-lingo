/**
 * JSON数据块接口
 */
export interface JsonModeChunk {
  isJsonMode: boolean;
  content: any;
}

/**
 * 验证数据格式
 */
export function isValidStreamData(value: any): boolean {
  return (
    value &&
    typeof value === "object" &&
    "isJsonMode" in value &&
    typeof value.isJsonMode === "boolean" &&
    "content" in value
  );
}

/**
 * 记录流数据
 */
export function logStreamData(requestId: string, done: boolean, value: any) {
  if (value && !done) {
    console.log(`[Background] SSE读取数据: ${requestId}`, {
      done,
      value: typeof value === "object" ? `[Object]` : value,
      size: JSON.stringify(value).length,
    });
  } else {
    console.log(`[Background] SSE读取数据: ${requestId}`, { done });
  }
}

/**
 * 记录无效数据
 */
export function logInvalidData(requestId: string, value: any) {
  console.warn(`[Background] 收到非预期格式数据: ${requestId}`, {
    type: typeof value,
    value: value ? JSON.stringify(value).substring(0, 100) : "null",
    hasIsJsonMode:
      value && typeof value === "object" ? "isJsonMode" in value : false,
  });
}
