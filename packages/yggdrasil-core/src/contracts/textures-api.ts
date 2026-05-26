import { z } from 'zod';

/**
 * Response shape for `GET /api/yggdrasil/textures/:uuid` — the
 * non-protocol convenience endpoint that returns raw URLs (not the
 * Yggdrasil profile textures property). Useful for admin UI, web
 * profile pages, and any client that doesn't want to base64-decode
 * the protocol payload.
 */
export const TexturesLookupResponseSchema = z.object({
  skin: z
    .object({
      url: z.string().min(1),
      variant: z.enum(['CLASSIC', 'SLIM']),
    })
    .nullable(),
  cape: z
    .object({
      url: z.string().min(1),
    })
    .nullable(),
});

export type TexturesLookupResponse = z.infer<typeof TexturesLookupResponseSchema>;
