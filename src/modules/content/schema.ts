import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max);
const itemId = z.uuid();
const phone = text(40).transform(value => value.replace(/[\s()-]/g, '').replace(/^8(?=\d{10}$)/, '+7')).pipe(z.string().regex(/^(?:\+[1-9]\d{7,14})?$/, 'Укажите телефон с кодом страны'));
const telegram = text(40).transform(value => value.replace(/^@/, '')).pipe(z.string().regex(/^(?:[a-zA-Z0-9_]{5,32})?$/, 'Укажите имя пользователя Telegram'));
const mapUrl = text(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === '2gis.ru' || (['yandex.ru', 'yandex.com'].includes(url.hostname) && url.pathname.startsWith('/maps'))); } catch { return false; }
}, 'Используйте HTTPS-ссылку на Яндекс Карты или 2ГИС');
const uniqueItems = <T extends { id: string }>(items: T[]) => new Set(items.map(item => item.id)).size === items.length;
export const siteContentSchema = z.object({
  hero: z.object({ title: text(160).min(1), subtitle: text(500).min(1), locationLabel: text(160).min(1) }).strict(),
  about: z.object({ title: text(160).min(1), text: text(5000).min(1), settingLabel: text(500) }).strict(),
  amenities: z.array(z.object({ id: itemId, name: text(100).min(1), details: text(500), visible: z.boolean(), confirmed: z.boolean() }).strict()).max(40).refine(uniqueItems, 'Повторяется удобство'),
  formats: z.array(z.object({ id: itemId, title: text(100).min(1), text: text(500).min(1), visible: z.boolean() }).strict()).max(12).refine(uniqueItems, 'Повторяется формат'),
  faq: z.array(z.object({ id: itemId, question: text(200).min(1), answer: text(1500).min(1), visible: z.boolean() }).strict()).max(30).refine(uniqueItems, 'Повторяется вопрос'),
  location: z.object({ address: text(500), mapUrl, visible: z.boolean() }).strict(),
  contacts: z.object({ phone, telegram, visible: z.boolean() }).strict(),
  seo: z.object({ title: text(120).min(1), description: text(400).min(1) }).strict(),
}).strict();
export const publishableContentSchema = siteContentSchema.superRefine((data, ctx) => {
  data.amenities.forEach((item, index) => { if (item.visible && !item.confirmed) ctx.addIssue({ code: 'custom', path: ['amenities', index], message: `Подтвердите готовность удобства «${item.name}» или скройте его` }); });
  if (data.location.visible && !data.location.address) ctx.addIssue({ code: 'custom', path: ['location'], message: 'Укажите точный адрес или скройте местоположение' });
  if (data.contacts.visible && !data.contacts.phone && !data.contacts.telegram) ctx.addIssue({ code: 'custom', path: ['contacts'], message: 'Добавьте телефон/Telegram или скройте контакты' });
});
export type SiteContentData = z.infer<typeof siteContentSchema>;
