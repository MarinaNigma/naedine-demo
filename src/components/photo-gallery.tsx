'use client';
import { useEffect, useRef, useState } from 'react';
import { categoryLabels, photoSrcSet, photoUrl, type PublicPhoto } from '@/modules/media/types';
export function HeroPhoto({ photo }: { photo: PublicPhoto }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="photo-placeholder"><p>Фотография временно недоступна</p></div>;
  return <figure className="hero-photo"><img src={photoUrl(photo.id, 'large.webp')} srcSet={photoSrcSet(photo)} sizes="(max-width: 800px) 100vw, 50vw" width={photo.width} height={photo.height} alt={photo.alt} fetchPriority="high" onError={() => setFailed(true)} />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>;
}
export function PhotoGallery({ photos }: { photos: PublicPhoto[] }) {
  const [category, setCategory] = useState('all'), [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement | null>(null);
  const filtered = photos.filter(photo => category === 'all' || photo.category === category), selected = index === null ? null : filtered[index];
  const open = index !== null && Boolean(selected);
  useEffect(() => { if (index !== null && !selected) setIndex(null); }, [index, selected]);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!photos.length) return <p className="notice">Настоящие фотографии дома и территории добавим позже.</p>;
  const move = (direction: number) => filtered.length > 0 && setIndex(value => ((value ?? 0) + direction + filtered.length) % filtered.length);
  return <div className="gallery-content"><div className="gallery-filters" aria-label="Категории фотографий"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Все фото</button>{Object.entries(categoryLabels).filter(([key]) => photos.some(photo => photo.category === key)).map(([value, name]) => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{name}</button>)}</div><div className="gallery-masonry">{filtered.map((photo, number) => <figure key={photo.id}><button type="button" className="gallery-thumb" aria-label={`Открыть фото: ${photo.alt}`} onClick={event => { trigger.current = event.currentTarget; setIndex(number); }}><img src={photoUrl(photo.id)} srcSet={photoSrcSet(photo)} sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" />{photo.caption && <span>{photo.caption}</span>}</button></figure>)}</div>
    <dialog className="gallery-dialog" ref={dialog} aria-labelledby="gallery-dialog-caption" onClose={() => { setIndex(null); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } }}>
      <div className="gallery-dialog-inner"><button className="gallery-close" type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Закрыть просмотр">✕</button>{selected && <figure><img src={photoUrl(selected.id, 'master.webp')} width={selected.width} height={selected.height} alt={selected.alt} /><figcaption id="gallery-dialog-caption">{selected.caption || selected.alt}</figcaption></figure>}<div className="gallery-navigation"><button type="button" onClick={() => move(-1)} disabled={filtered.length < 2}>← Предыдущее</button><span>{index === null ? 0 : index + 1} / {filtered.length}</span><button type="button" onClick={() => move(1)} disabled={filtered.length < 2}>Следующее →</button></div></div>
    </dialog>
  </div>;
}
