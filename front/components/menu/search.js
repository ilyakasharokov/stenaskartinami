import React from 'react';
import Link from 'next/link';
import { InstantSearch, SearchBox, Hits, Configure, useInstantSearch } from 'react-instantsearch';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
import imageUrlBuilder from '@/utils/img-url-builder';

function makeSearchClient() {
  try {
    const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST || "https://meili.stenaskartinami.com/";
    const key = process.env.NEXT_PUBLIC_MEILISEARCH_KEY || "";
    const { searchClient: client } = instantMeiliSearch(host, key);
    return {
      search(requests) {
        const emptyResult = requests.map(r => ({
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
          hitsPerPage: r?.params?.hitsPerPage || 10,
          exhaustiveNbHits: true,
          processingTimeMS: 0,
          query: r?.params?.query || '',
          params: '',
        }));
        const hasQuery = requests.some(r => r.params?.query?.trim());
        if (!hasQuery) return Promise.resolve({ results: emptyResult });
        return client.search(requests).catch(() => ({ results: emptyResult }));
      },
    };
  } catch {
    return null;
  }
}

const searchClient = makeSearchClient();

function Hit({ hit, onSelect }) {
  return (
    <div className="search-item" onClick={onSelect}>
      <Link href={'/art/' + hit.slug + '--' + hit.id}>
        <div className="search-item__image" style={{ backgroundImage: 'url(' + imageUrlBuilder(hit.img) + ')' }}></div>
        <div className="search-item__text">
          <div className="search-item__title">{hit.Title}</div>
          <div className="search-item__artist">{hit.Artist_full_name}</div>
        </div>
      </Link>
    </div>
  );
}

function Results({ onSelect, userQuery }) {
  const { results, status } = useInstantSearch();
  if (!userQuery) return null;
  if (status === 'loading' || status === 'stalled') return null;
  if (results?.hits?.length) {
    return (
      <div className="search__results">
        <Hits hitComponent={({ hit }) => <Hit hit={hit} onSelect={onSelect} />} />
      </div>
    );
  }
  return (
    <div className="search__results">
      <div className="search__nothing-found">Ничего не найдено</div>
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="top-search-widget">
      <button type="submit"></button>
      <input placeholder="Найти картины, художников..." className="ais-SearchBox-input" disabled />
    </div>
  );
}

class SearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <SearchFallback />;
    return this.props.children;
  }
}

const DEBOUNCE_MS = 250;

export default function SearchWidget() {
  const [query, setQuery] = React.useState('');
  const timerRef = React.useRef(null);

  const queryHook = React.useCallback((q, search) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) {
      search('');
      return;
    }
    timerRef.current = setTimeout(() => search(q), DEBOUNCE_MS);
  }, []);

  if (!searchClient) return <SearchFallback />;

  return (
    <SearchErrorBoundary>
      <div className={`top-search-widget ${query.length ? 'filled' : ''}`}>
        <InstantSearch indexName="art" searchClient={searchClient}>
          <Configure hitsPerPage={10} />
          <button type="submit"></button>
          <SearchBox
            placeholder="Найти картины, художников..."
            queryHook={queryHook}
            onReset={() => setQuery('')}
          />
          <Results onSelect={() => setQuery('')} userQuery={query} />
        </InstantSearch>
      </div>
    </SearchErrorBoundary>
  );
}
