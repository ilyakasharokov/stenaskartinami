import React from 'react';
import Link from 'next/link';
import imageUrlBuilder from '@/utils/img-url-builder';

const DEBOUNCE_MS = 300;

export default function SearchWidget() {
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setHits([]); setTotal(0); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/meili-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: 'art', params: { query: q.trim(), hitsPerPage: 6 } }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setHits(data.hits || []);
        setTotal(data.totalHits || 0);
        setOpen(true);
      } catch { setHits([]); }
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery(''); setHits([]); setTotal(0); setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = () => { setQuery(''); setHits([]); setTotal(0); setOpen(false); };

  return (
    <div className={`top-search-widget${query ? ' filled' : ''}`} ref={wrapRef}>
      <input
        ref={inputRef}
        className="ais-SearchBox-input"
        placeholder="Найти картины, художников..."
        value={query}
        onChange={handleChange}
        onFocus={() => { if (hits.length > 0) setOpen(true); }}
        autoComplete="off"
      />
      {query ? (
        <button className="search-clear-btn" onClick={handleClear} type="button" aria-label="Очистить">
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2">
            <line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/>
          </svg>
        </button>
      ) : (
        <span className="search-icon-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
      )}

      {open && (
        <div className="search__dropdown">
          {hits.length > 0 ? (
            <>
              <div className="search__section-header">
                <span className="search__section-title">Картины</span>
                <Link href="/catalog" className="search__see-all" onClick={handleSelect}>
                  Смотреть все ({total})
                </Link>
              </div>
              <div className="search__cards">
                {hits.map(hit => (
                  <Link
                    key={hit.id}
                    href={`/art/${hit.slug}--${hit.id}`}
                    className="search__card"
                    onClick={handleSelect}
                  >
                    <div
                      className="search__card-img"
                      style={{ backgroundImage: `url(${imageUrlBuilder(hit.img_thumb || hit.img)})` }}
                    />
                    <div className="search__card-body">
                      <div className="search__card-title">{hit.Title}</div>
                      <div className="search__card-artist">{hit.Artist_full_name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="search__nothing-found">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
