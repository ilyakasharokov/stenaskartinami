import React from 'react';
import Link from 'next/link';
import imageUrlBuilder from '@/utils/img-url-builder';

const DEBOUNCE_MS = 300;

async function searchIndex(index, query, hitsPerPage) {
  const res = await fetch('/api/meili-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index, params: { query, hitsPerPage } }),
  });
  if (!res.ok) return { hits: [], totalHits: 0 };
  const data = await res.json();
  return { hits: data.hits || [], totalHits: data.totalHits || 0 };
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function SearchWidget() {
  const [query, setQuery] = React.useState('');
  const [arts, setArts] = React.useState({ hits: [], totalHits: 0 });
  const [artists, setArtists] = React.useState({ hits: [], totalHits: 0 });
  const [walls, setWalls] = React.useState({ hits: [], totalHits: 0 });
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
    if (!q.trim()) {
      setArts({ hits: [], totalHits: 0 });
      setArtists({ hits: [], totalHits: 0 });
      setWalls({ hits: [], totalHits: 0 });
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const [a, ar, w] = await Promise.all([
          searchIndex('art', q.trim(), 6),
          searchIndex('artist', q.trim(), 4),
          searchIndex('wall', q.trim(), 3),
        ]);
        setArts(a);
        setArtists(ar);
        setWalls(w);
        setOpen(true);
      } catch { /* ignore */ }
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQuery('');
    setArts({ hits: [], totalHits: 0 });
    setArtists({ hits: [], totalHits: 0 });
    setWalls({ hits: [], totalHits: 0 });
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = () => {
    setQuery('');
    setArts({ hits: [], totalHits: 0 });
    setArtists({ hits: [], totalHits: 0 });
    setWalls({ hits: [], totalHits: 0 });
    setOpen(false);
  };

  const hasResults = arts.hits.length > 0 || artists.hits.length > 0 || walls.hits.length > 0;

  return (
    <div className={`top-search-widget${query ? ' filled' : ''}`} ref={wrapRef}>
      <input
        ref={inputRef}
        className="ais-SearchBox-input"
        placeholder="Найти картины, художников..."
        value={query}
        onChange={handleChange}
        onFocus={() => { if (hasResults) setOpen(true); }}
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
          {!hasResults ? (
            <div className="search__nothing-found">Ничего не найдено</div>
          ) : (
            <>
              {/* ── Картины ── */}
              {arts.hits.length > 0 && (
                <div className="search__section">
                  <div className="search__section-header">
                    <span className="search__section-title">Картины</span>
                    <Link href={`/catalog?q=${encodeURIComponent(query)}`} className="search__see-all" onClick={handleSelect}>
                      Смотреть все ({arts.totalHits})
                    </Link>
                  </div>
                  <div className="search__cards">
                    {arts.hits.map(hit => (
                      <Link key={hit.id} href={`/art/${hit.slug}--${hit.id}`} className="search__card" onClick={handleSelect}>
                        <div className="search__card-img" style={{ backgroundImage: `url(${imageUrlBuilder(hit.img_thumb || hit.img)})` }} />
                        <div className="search__card-body">
                          <div className="search__card-title">{hit.Title}</div>
                          <div className="search__card-artist">{hit.Artist_full_name}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Художники ── */}
              {artists.hits.length > 0 && (
                <div className="search__section">
                  <div className="search__section-header">
                    <span className="search__section-title">Художники</span>
                    <Link href={`/catalog?q=${encodeURIComponent(query)}`} className="search__see-all" onClick={handleSelect}>
                      Смотреть все ({artists.totalHits})
                    </Link>
                  </div>
                  <div className="search__artists">
                    {artists.hits.map(hit => (
                      <Link key={hit.id} href={`/artists/${hit.slug}--${hit.id}`} className="search__artist" onClick={handleSelect}>
                        <div className="search__artist-avatar">
                          {hit.avatar
                            ? <img src={imageUrlBuilder(hit.avatar)} alt={hit.full_name} />
                            : <span>{initials(hit.full_name)}</span>
                          }
                        </div>
                        <div className="search__artist-name">{hit.full_name}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Стены ── */}
              {walls.hits.length > 0 && (
                <div className="search__section">
                  <div className="search__section-header">
                    <span className="search__section-title">Стены</span>
                    <Link href="/walls" className="search__see-all" onClick={handleSelect}>
                      Смотреть все ({walls.totalHits})
                    </Link>
                  </div>
                  <div className="search__walls">
                    {walls.hits.map(hit => (
                      <Link key={hit.id} href={`/walls/${hit.slug}--${hit.id}`} className="search__wall" onClick={handleSelect}>
                        <div className="search__wall-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                          </svg>
                        </div>
                        <div className="search__wall-body">
                          <div className="search__wall-title">{hit.Title}</div>
                          {hit.Address && <div className="search__wall-address">{hit.Address}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
