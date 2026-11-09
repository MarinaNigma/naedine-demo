import { z } from 'zod';

const DAY = 86_400_000;
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату в формате ГГГГ-ММ-ДД').refine(value => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return value.slice(0, 4) !== '0000' && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}, 'Укажите существующую дату');

export const quoteInputSchema = z.object({
  checkIn: dateSchema,
  checkOut: dateSchema,
  adults: z.number().int().min(1, 'Нужен хотя бы один взрослый').max(8),
  children: z.number().int().min(0).max(7),
  saunaDays: z.array(dateSchema).default([]),
}).strict().superRefine((input, ctx) => {
  if (input.checkOut <= input.checkIn) ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Выезд должен быть позже заезда' });
  if (input.adults + input.children > 8) ctx.addIssue({ code: 'custom', path: ['children'], message: 'Всего не более 8 гостей, включая младенцев' });
  if (new Set(input.saunaDays).size !== input.saunaDays.length) ctx.addIssue({ code: 'custom', path: ['saunaDays'], message: 'День сауны выбран повторно' });
  for (const date of input.saunaDays) {
    if (date < input.checkIn || date >= input.checkOut) ctx.addIssue({ code: 'custom', path: ['saunaDays'], message: 'Сауна доступна только в дни ночёвок, без дня выезда' });
  }
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;
const moneySchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const pricingRulesSchema = z.object({
  version: z.string().min(1), minimumNights: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1), weekdayKopecks: moneySchema,
  weekendKopecks: moneySchema, holidayKopecks: moneySchema,
  saunaDayKopecks: moneySchema,
  holidayMonthDays: z.array(z.string().regex(/^\d{2}-\d{2}$/).refine(value => dateSchema.safeParse(`2000-${value}`).success, 'Некорректный праздничный день')).refine(value => new Set(value).size === value.length, 'Праздничные дни не должны повторяться'),
  overrides: z.record(dateSchema, moneySchema),
});
export type PricingRules = z.infer<typeof pricingRulesSchema>;
export type RateKind = 'weekday' | 'weekend' | 'holiday' | 'override';
export type Quote = {
  currency: 'RUB'; rulesVersion: string; checkIn: string; checkOut: string;
  nights: number; adults: number; children: number;
  lines: { kind: RateKind; nights: number; rateKopecks: number; subtotalKopecks: number }[];
  saunaDays: string[]; saunaDayKopecks: number; accommodationKopecks: number;
  saunaKopecks: number; discountKopecks: 0; totalKopecks: number;
  depositKopecks: number; estimatedBalanceKopecks: number;
};

function toMoney(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Сумма выходит за технический диапазон расчёта');
  return Number(value);
}

// Pure calculation only. A quote does not check availability or reserve dates.
export function calculateQuote(rawInput: unknown, rawRules: PricingRules): Quote {
  const input = quoteInputSchema.parse(rawInput);
  const rules = pricingRulesSchema.parse(rawRules);
  const start = Date.parse(`${input.checkIn}T00:00:00Z`);
  const end = Date.parse(`${input.checkOut}T00:00:00Z`);
  const nights = (end - start) / DAY;
  z.number().min(rules.minimumNights, `Минимальное проживание — ${rules.minimumNights} ночей`).parse(nights);
  const holidays = new Set(rules.holidayMonthDays);
  const buckets = new Map<string, { kind: RateKind; nights: number; rateKopecks: number; subtotal: bigint }>();
  let accommodation = 0n;
  for (let time = start; time < end; time += DAY) {
    const day = new Date(time);
    const date = day.toISOString().slice(0, 10);
    let kind: RateKind;
    let rate: number;
    if (Object.hasOwn(rules.overrides, date)) { kind = 'override'; rate = rules.overrides[date]; }
    else if (holidays.has(date.slice(5))) { kind = 'holiday'; rate = rules.holidayKopecks; }
    else if (day.getUTCDay() === 5 || day.getUTCDay() === 6) { kind = 'weekend'; rate = rules.weekendKopecks; }
    else { kind = 'weekday'; rate = rules.weekdayKopecks; }
    const key = `${kind}:${rate}`;
    const line = buckets.get(key) ?? { kind, nights: 0, rateKopecks: rate, subtotal: 0n };
    line.nights++;
    line.subtotal += BigInt(rate);
    buckets.set(key, line);
    accommodation += BigInt(rate);
  }
  const sauna = BigInt(input.saunaDays.length) * BigInt(rules.saunaDayKopecks);
  const total = accommodation + sauna;
  const deposit = (total * 30n + 50n) / 100n;
  return {
    currency: 'RUB', rulesVersion: rules.version, checkIn: input.checkIn, checkOut: input.checkOut,
    nights, adults: input.adults, children: input.children,
    lines: [...buckets.values()].map(({ subtotal, ...line }) => ({ ...line, subtotalKopecks: toMoney(subtotal) })),
    saunaDays: [...input.saunaDays].sort(), saunaDayKopecks: rules.saunaDayKopecks,
    accommodationKopecks: toMoney(accommodation), saunaKopecks: toMoney(sauna), discountKopecks: 0,
    totalKopecks: toMoney(total), depositKopecks: toMoney(deposit), estimatedBalanceKopecks: toMoney(total - deposit),
  };
}
