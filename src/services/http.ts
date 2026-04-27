/**
 * 请求基座：后续接真实 API 时统一改此处（baseURL、鉴权、错误码 → Toast）
 * 原型阶段页面可继续直接使用 mocks/data.ts
 */

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  method?: HttpMethod;
  /** JSON 请求体 */
  json?: unknown;
}

export class HttpError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, headers, ...rest } = options;
  const url = path.startsWith('http') ? path : `${baseURL.replace(/\/$/, '')}${path}`;

  const init: RequestInit = {
    method,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...rest,
  };
  if (json !== undefined) {
    init.body = JSON.stringify(json);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = text;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new HttpError(res.statusText || '请求失败', res.status, data);
  }
  return data as T;
}
