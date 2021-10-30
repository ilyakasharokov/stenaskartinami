import React, { useState } from 'react';
import { InstantSearch, SearchBox, Hits, Highlight, Configure, connectStateResults } from 'react-instantsearch-dom';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
import imageUrlBuilder from '@/utils/img-url-builder'
import Link from 'next/link'

const searchClient = instantMeiliSearch(
  "https://meili.stenaskartinami.com/",
  ""
);

function Hit(props) {
  return <div className="search-item">
    <Link href={ '/art/' + props.hit.slug + '--' + props.hit.id} onClick={ () => {}}>
      <a>
        <div className="search-item__image" style={{ backgroundImage: 'url(' + imageUrlBuilder(props.hit.img) + ')'}}></div>
        <div className="search-item__text">
          <div className="search-item__title">{props.hit.Title}</div>
          <div className="search-item__artist">{props.hit.Artist_full_name}</div>
        </div>
      </a>
    </Link>
  </div>;
}


export default function SearchWidget(){

  const [filled, setFilled] = useState(false)

  const Results = connectStateResults(({ searchState, searchResults }) => 
    searchState && searchState.query ? (
      searchResults && searchResults.hits && searchResults.hits.length ? 
      <div className="search__results">
        <Hits hitComponent={Hit} />
      </div> : 
      <div className="search__results">
        <div className="search__nothing-found">Ничего не найдено</div>
      </div>
      
    ) : ""
  );

  return (<div className="top-search-desktop">
    <div className={`top-search-widget ${filled ? 'filled': ''}`}>
      <InstantSearch
      indexName="art"
      searchClient={searchClient}
      onSearchStateChange={searchState => {
        setFilled(searchState.query.length > 0)
      }}>  
      <Configure
        hitsPerPage={10}/>
        <button type="submit"></button>
        <SearchBox translations={{
            placeholder: 'Найти...'
            }}/>
          <Results></Results>
        </InstantSearch>
    </div>
    </div>
  )
}
