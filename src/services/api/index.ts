/**
 * API服务模块入口
 * 提供统一的API客户端接口
 */
import { cancelAllRequests, cancelRequest } from "./abortController";
import { ApiClientConfig, createApiConfig } from "./core";
import { del, get, patch, post, put } from "./http";
import { sse } from "./sse";

/**
 * 创建API客户端
 * 支持常规HTTP请求和SSE流式请求
 */
export const createApiClient = (config: ApiClientConfig) => {
  const { baseUrl, baseConfig } = createApiConfig(config);

  // 返回包含所有API方法的对象
  return {
    // 标准HTTP方法
    get: get(baseUrl),
    post: post(baseUrl),
    put: put(baseUrl),
    delete: del(baseUrl),
    patch: patch(baseUrl),

    // SSE流式请求
    sse: sse(baseUrl),

    // 请求取消方法
    cancelRequest,
    cancelAllRequests,

    // 客户端配置
    baseUrl,
    baseConfig,
  };
};

// 导出类型
export type { RequestConfig } from "./abortController";
export type { ApiClientConfig } from "./core";
export type { SSEConfig } from "./sse";

/**
 * 默认API客户端
 * 方便直接导入使用
 */
export const defaultApiClient = createApiClient({
  baseUrl: "http://localhost:3000", // 直接硬编码API地址，不再使用process.env
});

/**
 * 使用示例:
 *
 * // 1. 创建自定义API客户端
 * const api = createApiClient({
 *   baseUrl: 'https://api.myservice.com',
 *   defaultHeaders: { 'Authorization': 'Bearer token' }
 * });
 *
 * // 2. 使用GET请求
 * const data = await api.get('/users/123');
 *
 * // 3. 使用POST请求
 * const result = await api.post('/users', { name: 'John' });
 *
 * // 4. 使用SSE流式请求
 * const stream = api.sse('/events');
 * for await (const chunk of stream) {
 *   console.log(chunk);
 * }
 *
 * // 5. 取消请求
 * const requestId = 'my-request-id';
 * api.cancelRequest(requestId);
 */
