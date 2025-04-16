/**
 * API服务类型定义
 */

/**
 * 通用API响应结构
 */
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

/**
 * API错误类型
 */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
