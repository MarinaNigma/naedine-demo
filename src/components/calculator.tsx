'use client';

import { useState } from 'react';
import type { Quote, RateKind } from '@/modules/pricing/calculator';
const money = (kopecks: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(kopecks / 100);
const dateLabel = (date: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const kinds: Record<RateKind, string> = { weekday: 'Будние ночи', weekend: 'Пятница и суббота', holiday: 'Праздничные ночи', override: 'Индивидуальный тариф' };

export function Calculator({ saunaDayKopecks, capacity }: { saunaDayKopecks: number; capacity: number }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(String(Math.min(2, capacity)));
  const [children, setChildren] = useState('0');
  const [saunaDays, setSaunaDays] = useState<string[]>([]);
  const [saunaDate, setSaunaDate] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [pending, setPending] = useState(false);

  const clearQuote = () => { setQuote(null); setError(''); };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setQuote(null); setError('');
    try {
      const response = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkIn, checkOut, adults: Number(adults), children: Number(children), saunaDays }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.issues?.map((issue: { message: string }) => issue.message).join('. ') || result.error);
      setQuote(result.quote); setDemo(result.demoMode === true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось получить расчёт. Попробуйте ещё раз.'); }
    finally { setPending(false); }
  }

  return <div className="calculator-layout">
    <form onSubmit={submit} className="calculator-form" aria-busy={pending}>
      <fieldset disabled={pending}>
        <legend className="sr-only">Даты, гости и сауна</legend>
        <div className="field-row">
          <label>Заезд<input type="date" required value={checkIn} onChange={e => { setCheckIn(e.target.value); setSaunaDays([]); setSaunaDate(''); clearQuote(); }} /><small>С 14:00</small></label>
          <label>Выезд<input type="date" required min={checkIn || undefined} value={checkOut} onChange={e => { setCheckOut(e.target.value); setSaunaDays([]); setSaunaDate(''); clearQuote(); }} /><small>До 12:00 · Тюмень, UTC+5</small></label>
        </div>
        <div className="field-row">
          <label>Взрослые<input type="number" required min="1" max={capacity} value={adults} onChange={e => { setAdults(e.target.value); clearQuote(); }} /></label>
          <label>Дети<input type="number" required min="0" max={Math.max(0, capacity - 1)} value={children} onChange={e => { setChildren(e.target.value); clearQuote(); }} /></label>
        </div>
        <p className="hint">До {capacity} гостей, включая детей и младенцев. Минимум один взрослый.</p>
        <div className="sauna-box">
          <h3>Добавить сауну</h3><p className="hint">{money(saunaDayKopecks)} за день ночёвки. День выезда не включён.</p>
          <label htmlFor="sauna-date">День сауны</label>
          <div className="sauna-control"><input id="sauna-date" type="date" min={checkIn || undefined} value={saunaDate} onChange={e => setSaunaDate(e.target.value)} />
          <button type="button" className="secondary" disabled={!checkIn || !checkOut || !saunaDate} onClick={() => {
            if (saunaDate < checkIn || saunaDate >= checkOut) { setError('Выберите день сауны от заезда до дня перед выездом'); return; }
            if (!saunaDays.includes(saunaDate)) { setSaunaDays([...saunaDays, saunaDate].sort()); clearQuote(); }
          }}>Добавить</button></div>
          {saunaDays.length > 0 && <ul className="sauna-list">{saunaDays.map(date => <li key={date}>{dateLabel(date)} <button type="button" aria-label={`Убрать сауну ${dateLabel(date)}`} onClick={() => { setSaunaDays(saunaDays.filter(day => day !== date)); clearQuote(); }}>Убрать</button></li>)}</ul>}
        </div>
        <button className="button calculate" type="submit">{pending ? 'Рассчитываем…' : 'Рассчитать стоимость'}<span aria-hidden="true">↗</span></button>
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
    <aside className="quote" aria-live="polite" aria-atomic="true">
      <p className="eyebrow">Ваш отдых</p>
      {quote ? <>
        <h3>{quote.nights} {quote.nights === 1 ? 'ночь' : 'ночей'} за городом</h3>
        <dl className="quote-lines">{quote.lines.map(line => <div key={`${line.kind}-${line.rateKopecks}`}><dt>{kinds[line.kind]}<small>{line.nights} × {money(line.rateKopecks)}</small></dt><dd>{money(line.subtotalKopecks)}</dd></div>)}
          {quote.saunaDays.length > 0 && <div><dt>Сауна<small>{quote.saunaDays.length} × {money(quote.saunaDayKopecks)}</small></dt><dd>{money(quote.saunaKopecks)}</dd></div>}
          <div className="quote-total"><dt>Итого</dt><dd>{money(quote.totalKopecks)}</dd></div>
          <div><dt>Предоплата 30%</dt><dd>{money(quote.depositKopecks)}</dd></div>
          <div><dt>Остаток</dt><dd>{money(quote.estimatedBalanceKopecks)}</dd></div>
        </dl>
        <p className="hint">{demo ? 'Демонстрационный расчёт по начальным тарифам.' : 'Цена рассчитана на сервере по сохранённым тарифам.'} Доступность дат пока не проверяется.</p>
      </> : <><h3>Сначала — ваши даты.<br />Потом — время для себя.</h3><p>Выберите даты и гостей, чтобы увидеть стоимость проживания и предоплату.</p><div className="quote-placeholder" aria-hidden="true">— ₽</div></>}
      <div className="notice">Приём заявок пока не открыт. Этот расчёт не удерживает даты и не подтверждает бронь.</div>
    </aside>
  </div>;
}
