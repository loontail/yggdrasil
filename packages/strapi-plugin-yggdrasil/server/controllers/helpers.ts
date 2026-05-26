import type { ZodTypeAny, z } from 'zod';
import type { KoaContext, StrapiInstance } from '../types';

const HTTP_BAD_REQUEST = 400;

/**
 * Type-safe accessor for our own plugin's services. All controllers
 * resolve services via this helper to keep the cast in one place.
 */
export const pluginService = <T>(strapi: StrapiInstance, name: string): T =>
  strapi.plugin('yggdrasil').service(name) as T;

/**
 * Parse `body` (or `query` / `params`) against a Zod schema. Throws a
 * 400 Yggdrasil-flavoured error if validation fails — the
 * `error-shape` middleware further reshapes it into the canonical
 * `{ error, errorMessage }` envelope.
 */
export const parseOrThrow = <S extends ZodTypeAny>(
  ctx: KoaContext,
  schema: S,
  input: unknown,
): z.infer<S> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    ctx.status = HTTP_BAD_REQUEST;
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new YggdrasilHttpError(HTTP_BAD_REQUEST, 'IllegalArgumentException', message);
  }
  return parsed.data;
};

/**
 * Internal error that the `error-shape` middleware translates into the
 * Yggdrasil error envelope. Plain `ctx.throw` from Strapi gives us the
 * wrong body shape.
 */
export class YggdrasilHttpError extends Error {
  readonly status: number;
  readonly error: string;
  readonly errorCause: string | undefined;

  constructor(status: number, error: string, message: string, cause?: string) {
    super(message);
    this.name = 'YggdrasilHttpError';
    this.status = status;
    this.error = error;
    this.errorCause = cause;
  }
}

export const isYggdrasilHttpError = (value: unknown): value is YggdrasilHttpError =>
  value instanceof YggdrasilHttpError;
