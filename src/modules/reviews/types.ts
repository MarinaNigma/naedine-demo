import { z } from 'zod';
export class ReviewError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 429 | 503, message: string) { super(message); this.name = 'ReviewError'; }
}
export const reviewFieldsSchema = z.object({ displayName: z.string().trim().min(1).max(80), rating: z.number().int().min(1).max(5), text: z.string().trim().min(1).max(4000) }).strict();
export const reviewSubmissionSchema = reviewFieldsSchema.extend({ operationKey: z.uuid(), formToken: z.string().regex(/^[a-f0-9]{64}$/), consent: z.literal(true), photoRightsConfirmed: z.boolean().default(false), website: z.string().max(0).default('') });
export type PublicReview = { id: string; displayName: string; rating: number; text: string; createdAt: string; verified: boolean; source: string | null; sourceUrl: string | null; photo: { id: string; width: number; height: number } | null };
export const sourceUrlSchema = z.string().trim().max(2048).refine(value => { if (!value) return true; try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }, 'Нужна HTTPS-ссылка на источник');
