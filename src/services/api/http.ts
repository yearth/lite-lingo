/**
 * HTTP请求模块
 */
import { RequestConfig, prepareRequest } from "./abortController";
import { createRequestConfig } from "./core";
import { buildUrl, handleError, handleResponse } from "./utils";

/**
 * GET请求
 */
export const get =
  (baseUrl: string) =>
  async <T>(path: string, config: RequestConfig = {}): Promise<T> => {
    console.log("[ Lite Lingo ] get", path, config);
    const { signal, requestId } = prepareRequest(config);
    try {
      const url = buildUrl(`${baseUrl}${path}`, config.params);
      const fetchConfig = createRequestConfig(config, {
        method: "GET",
        signal,
      });

      const response = await fetch(url, fetchConfig);
      return await handleResponse<T>(response);
    } catch (error) {
      return handleError(error, requestId);
    } finally {
      // 请求完成后清理资源...
    }
  };

/**
 * POST请求
 */
export const post =
  (baseUrl: string) =>
  async <T>(
    path: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> => {
    const { signal, requestId } = prepareRequest(config);
    try {
      const url = buildUrl(`${baseUrl}${path}`, config.params);
      const fetchConfig = createRequestConfig(config, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      const response = await fetch(url, fetchConfig);
      return await handleResponse<T>(response);
    } catch (error) {
      return handleError(error, requestId);
    }
  };

/**
 * PUT请求
 */
export const put =
  (baseUrl: string) =>
  async <T>(
    path: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> => {
    const { signal, requestId } = prepareRequest(config);
    try {
      const url = buildUrl(`${baseUrl}${path}`, config.params);
      const fetchConfig = createRequestConfig(config, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      const response = await fetch(url, fetchConfig);
      return await handleResponse<T>(response);
    } catch (error) {
      return handleError(error, requestId);
    }
  };

/**
 * DELETE请求
 */
export const del =
  (baseUrl: string) =>
  async <T>(path: string, config: RequestConfig = {}): Promise<T> => {
    const { signal, requestId } = prepareRequest(config);
    try {
      const url = buildUrl(`${baseUrl}${path}`, config.params);
      const fetchConfig = createRequestConfig(config, {
        method: "DELETE",
        signal,
      });

      const response = await fetch(url, fetchConfig);
      return await handleResponse<T>(response);
    } catch (error) {
      return handleError(error, requestId);
    }
  };

/**
 * PATCH请求
 */
export const patch =
  (baseUrl: string) =>
  async <T>(
    path: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> => {
    const { signal, requestId } = prepareRequest(config);
    try {
      const url = buildUrl(`${baseUrl}${path}`, config.params);
      const fetchConfig = createRequestConfig(config, {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      const response = await fetch(url, fetchConfig);
      return await handleResponse<T>(response);
    } catch (error) {
      return handleError(error, requestId);
    }
  };
