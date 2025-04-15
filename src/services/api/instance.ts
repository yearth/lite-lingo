/**
 * API客户端实例
 * 提供全局单例API客户端
 */
import { createApiClient } from "./index";

// 创建全局API客户端实例
export const api = createApiClient({
  baseUrl: "http://localhost:3000",
  defaultHeaders: {
    Accept: "application/json", // 移除Content-Type头，将由createRequestConfig根据请求方法决定是否添加
  },
  defaultTimeout: 30000, // 30秒超时
});

// 导出常用方法便于直接使用
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const del = api.delete;
export const patch = api.patch;
export const sse = api.sse;
export const cancelRequest = api.cancelRequest;

/**
 * 通过background脚本发送请求的方法（解决CORS问题）
 */
export async function backgroundGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  // 构建完整URL
  const url = `http://127.0.0.1:3000${path}${
    params ? "?" + new URLSearchParams(params).toString() : ""
  }`;

  // 发送消息到background脚本处理请求
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "API_REQUEST",
        url,
        method: "GET",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || "请求失败"));
        }
      }
    );
  });
}
