import React, { useState } from 'react';
import { InstantSearch, SearchBox, Hits, Highlight, Configure, connectStateResults } from 'react-instantsearch-dom';
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';
import imageUrlBuilder from '@/utils/img-url-builder'
import Link from 'next/link'

const searchClient = instantMeiliSearch(
  "https://meili.stenaskartinami.com/",
  ""
);

function Item(props) {
  return <div className="search-item" onClick={() => {
        props.setSearchState({
          ...props.searchState,
          query: '',
        })}}>
    <Link href={ '/art/' + props.hit.slug + '--' + props.hit.id} >
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

  //const [filled, setFilled] = useState(false)
  const [searchState, setSearchState] = useState({});

  const Hit = React.useRef(props => (
    <Item
      {...props}
      searchState={searchState}
      setSearchState={setSearchState}
    />
  ));

  const Results = connectStateResults(({ searchState, searchResults }) => 
    searchState && searchState.query ? (
      searchResults && searchResults.hits && searchResults.hits.length ? 
      <div className="search__results">
        <Hits hitComponent={Hit.current}  
          searchState={searchState}
          setSearchState={setSearchState}/>
      </div> : 
      <div className="search__results">
        <div className="search__nothing-found">Ничего не найдено</div>
      </div>
      
    ) : ""
  );

  return (
    <div className={`top-search-widget ${true ? 'filled': ''}`}>
      <InstantSearch
      indexName="art"
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={searchState => {
        //setFilled(searchState.query.length > 0)
        setSearchState(searchState)
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
  )
}
