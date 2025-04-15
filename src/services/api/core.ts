/**
 * API核心请求配置模块
 */
import { RequestConfig } from "./abortController";

// 默认请求头
const defaultHeaders = {
  Accept: "application/json",
};

// 默认请求配置
const defaultConfig: RequestConfig = {
  headers: defaultHeaders,
  timeout: 30000, // 默认30秒超时
};

/**
 * 创建请求配置
 * 合并默认配置和自定义配置
 */
export const createRequestConfig = (
  baseConfig: RequestConfig = {},
  customConfig: RequestConfig = {}
): RequestConfig => {
  const mergedConfig = {
    ...defaultConfig,
    ...baseConfig,
    ...customConfig,
    headers: {
      ...defaultConfig.headers,
      ...(baseConfig.headers || {}),
      ...(customConfig.headers || {}),
    },
  };

  // 避免请求配置中包含requestId，因为它不是Fetch API的一部分
  // 我们只需要在我们自己的管理系统中使用它
  const { requestId, ...fetchConfig } = mergedConfig;

  // 只有非GET请求才添加Content-Type头
  const method = (customConfig.method || "GET").toUpperCase();
  if (method !== "GET" && !fetchConfig.headers["Content-Type"]) {
    fetchConfig.headers["Content-Type"] = "application/json";
  }

  return fetchConfig;
};

/**
 * 创建API客户端的基础配置
 */
export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
}

/**
 * 创建自定义的请求配置
 */
export const createApiConfig = (
  config: ApiClientConfig
): {
  baseUrl: string;
  baseConfig: RequestConfig;
} => {
  const { baseUrl, defaultHeaders = {}, defaultTimeout } = config;

  // 创建基础配置
  const baseConfig: RequestConfig = {
    headers: { ...defaultHeaders },
  };

  if (defaultTimeout) {
    baseConfig.timeout = defaultTimeout;
  }

  return {
    baseUrl,
    baseConfig,
  };
};
