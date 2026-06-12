import React from 'react';
import Link from 'next/link';
import imageUrlBuilder from '@/utils/img-url-builder';

const DEBOUNCE_MS = 300;

async function searchMeili(query, hitsPerPage = 10) {
  const res = await fetch('/api/meili-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index: 'art', params: { query, hitsPerPage } }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.hits || [];
}

export default function SearchWidget() {
  const [query, setQuery] = React.useState('');
  const [hits, setHits] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) {
      setHits([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const results = await searchMeili(q.trim());
        setHits(results);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery('');
    setHits([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = () => {
    setQuery('');
    setHits([]);
    setOpen(false);
  };

  return (
    <div className={`top-search-widget${query ? ' filled' : ''}`}>
      <button type="submit" />
      <input
        ref={inputRef}
        className="ais-SearchBox-input"
        placeholder="Найти картины, художников..."
        value={query}
        onChange={handleChange}
      />
      {query && (
        <button type="reset" className="ais-SearchBox-reset" onClick={handleClear}>
          <svg viewBox="0 0 10 10" width="10" height="10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      )}
      {open && query && (
        <div className="search__results">
          {hits.length === 0 ? (
            <div className="search__nothing-found">Ничего не найдено</div>
          ) : (
            hits.map(hit => (
              <div key={hit.id} className="search-item" onClick={handleSelect}>
                <Link href={`/art/${hit.slug}--${hit.id}`}>
                  <div
                    className="search-item__image"
                    style={{ backgroundImage: `url(${imageUrlBuilder(hit.img_thumb || hit.img)})` }}
                  />
                  <div className="search-item__text">
                    <div className="search-item__title">{hit.Title}</div>
                    <div className="search-item__artist">{hit.Artist_full_name}</div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
