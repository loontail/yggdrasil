import { type YggdrasilErrorBody, YggdrasilErrorBodySchema } from '@loontail/yggdrasil-core';
import type { ZodTypeAny, z } from 'zod';
import {
  YggdrasilClientError,
  YggdrasilClientErrorCodes,
} from './errors/yggdrasil-client-error.js';

export type Fetcher = typeof fetch;

const HEADERS_GET = { accept: 'application/json' } as const;
const HEADERS_POST = {
  accept: 'application/json',
  'content-type': 'application/json',
} as const;

const isYggdrasilErrorBody = (body: unknown): body is YggdrasilErrorBody =>
  YggdrasilErrorBodySchema.safeParse(body).success;

/** Run `op` and convert any thrown error into a `YggdrasilClientError(NETWORK)`. */
const runFetch = async (url: string, op: () => Promise<Response>): Promise<Response> => {
  try {
    return await op();
  } catch (err) {
    throw new YggdrasilClientError(
      YggdrasilClientErrorCodes.NETWORK,
      `Network request failed: ${url}`,
      { cause: err, context: { url } },
    );
  }
};

/**
 * Issue a JSON POST. The response is parsed against `responseSchema`
 * when provided; pass `null` for 204-no-body endpoints.
 */
export const postJson = async <S extends ZodTypeAny | null>(opts: {
  fetcher: Fetcher;
  url: string;
  body: unknown;
  responseSchema: S;
}): Promise<S extends ZodTypeAny ? z.infer<S> : void> => {
  const response = await runFetch(opts.url, () =>
    opts.fetcher(opts.url, {
      method: 'POST',
      headers: HEADERS_POST,
      body: JSON.stringify(opts.body),
    }),
  );
  return handleResponse(response, opts.url, opts.responseSchema);
};

/** Issue a JSON GET. */
export const getJson = async <S extends ZodTypeAny>(opts: {
  fetcher: Fetcher;
  url: string;
  responseSchema: S;
}): Promise<z.infer<S>> => {
  const response = await runFetch(opts.url, () =>
    opts.fetcher(opts.url, { method: 'GET', headers: HEADERS_GET }),
  );
  return handleResponse(response, opts.url, opts.responseSchema);
};

const handleResponse = async <S extends ZodTypeAny | null>(
  response: Response,
  url: string,
  schema: S,
): Promise<S extends ZodTypeAny ? z.infer<S> : void> => {
  if (!response.ok) {
    const body = await readJsonSafe(response);
    throw new YggdrasilClientError(
      YggdrasilClientErrorCodes.HTTP_ERROR,
      `Yggdrasil request failed: ${response.status} ${url}`,
      {
        context: {
          status: response.status,
          url,
          ...(isYggdrasilErrorBody(body) ? { body } : {}),
        },
      },
    );
  }
  if (schema === null) {
    return undefined as S extends ZodTypeAny ? z.infer<S> : undefined;
  }
  const raw = await readJsonSafe(response);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new YggdrasilClientError(
      YggdrasilClientErrorCodes.INVALID_RESPONSE,
      `Yggdrasil response failed schema validation: ${url}`,
      { context: { url, status: response.status }, cause: parsed.error },
    );
  }
  return parsed.data as S extends ZodTypeAny ? z.infer<S> : undefined;
};

const readJsonSafe = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
