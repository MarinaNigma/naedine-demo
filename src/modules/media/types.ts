import { z } from 'zod';
import { staticPhotos } from './static-photos';
export const categoryLabels = { facade: 'Фасад', interior: 'Комнаты', kitchen: 'Кухня и гостиная', sauna: 'Сауна', territory: 'Территория', seasonal: 'Сезонные виды', other: 'Другое' };
export const categorySchema = z.enum(['facade', 'interior', 'kitchen', 'sauna', 'territory', 'seasonal', 'other']);
export const variantSchema = z.enum(['thumb.webp', 'medium.webp', 'large.webp', 'master.webp']);
export type ImageVariant = z.infer<typeof variantSchema>;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export type PublicPhoto = { id: string; width: number; height: number; alt: string; caption: string; category: z.infer<typeof categorySchema>; order: number; hero: boolean };
export function photoUrl(id: string, variant: ImageVariant = 'medium.webp', admin = false) { if (!admin && staticPhotos.some(photo => photo.id === id)) return `./assets/photos/${id}-${variant}`; return `${admin ? '/api/admin' : ''}/media/${id}/${variant}`; }
export function photoSrcSet(photo: PublicPhoto) {
  const seen = new Set<number>();
  return ([['thumb.webp', 480], ['medium.webp', 960], ['large.webp', 1600], ['master.webp', 2560]] as const).flatMap(([variant, size]) => {
    const width = Math.min(photo.width, size);
    if (seen.has(width)) return [];
    seen.add(width); return [`${photoUrl(photo.id, variant)} ${width}w`];
  }).join(', ');
}
export class MediaError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 413 | 415 | 429 | 503, message: string) { super(message); this.name = 'MediaError'; }
}
