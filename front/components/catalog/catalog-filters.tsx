import { useState, useEffect, useRef } from 'react'
import { useRouter } from "next/router";
import Router from 'next/router'
import Preloader from '../preloader/preloader';

const FILTER_ITEMS_NUM = 6;
const SECTION_SEARCH_MIN = 8; // показывать поиск внутри секции если элементов больше

export default function CatalogFilters({filtersPreloaded, onChange, hideFilters}){

  const router = useRouter();
  const [searchText, setSearchText] = useState((router.query?.q as string) || '');
  const [sectionSearch, setSectionSearch] = useState({});
  const searchTimerRef = useRef(null);

  const [price, setPrice] = useState({
    min: (router.query?.priceMin as string) || '',
    max: (router.query?.priceMax as string) || '',
  });
  const [priceOpen, setPriceOpen] = useState(!!(router.query?.priceMin || router.query?.priceMax));
  const priceTimerRef = useRef(null);

  const [sizeCustom, setSizeCustom] = useState({
    min: (router.query?.sizeMin as string) || '',
    max: (router.query?.sizeMax as string) || '',
  });
  const sizeTimerRef = useRef(null);

  useEffect(() => {
    setSearchText((router.query?.q as string) || '');
  }, [router.query?.q]);

  useEffect(() => {
    setPrice({
      min: (router.query?.priceMin as string) || '',
      max: (router.query?.priceMax as string) || '',
    });
  }, [router.query?.priceMin, router.query?.priceMax]);

  useEffect(() => {
    setSizeCustom({
      min: (router.query?.sizeMin as string) || '',
      max: (router.query?.sizeMax as string) || '',
    });
  }, [router.query?.sizeMin, router.query?.sizeMax]);

  function handleSizeChange(field, value) {
    const next = { ...sizeCustom, [field]: value.replace(/[^\d]/g, '') };
    setSizeCustom(next);
    clearTimeout(sizeTimerRef.current);
    sizeTimerRef.current = setTimeout(() => {
      const newQuery: Record<string, any> = { ...Router.query };
      if (next.min) newQuery.sizeMin = next.min; else delete newQuery.sizeMin;
      if (next.max) newQuery.sizeMax = next.max; else delete newQuery.sizeMax;
      delete newQuery.page;
      onChange();
      Router.push({ pathname: Router.pathname, query: newQuery });
    }, 600);
  }

  function handlePriceChange(field, value) {
    const next = { ...price, [field]: value.replace(/[^\d]/g, '') };
    setPrice(next);
    clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      const newQuery: Record<string, any> = { ...Router.query };
      if (next.min) newQuery.priceMin = next.min; else delete newQuery.priceMin;
      if (next.max) newQuery.priceMax = next.max; else delete newQuery.priceMax;
      delete newQuery.page;
      onChange();
      Router.push({ pathname: Router.pathname, query: newQuery });
    }, 600);
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchText(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const newQuery: Record<string, any> = { ...Router.query, q: val };
      if (!val) delete newQuery.q;
      delete newQuery.page;
      onChange();
      Router.push({ pathname: Router.pathname, query: newQuery });
    }, 400);
  }

  const [filters, setFilters] = useState({
    styles:{
      title: 'Стиль',
      items: [],
      open: true,
      showAll: false,
    }, 
    subjects: {
      title: 'Теги',
      items: [],
      open: true,
      showAll: false,
    }, 
      mediums: {
      title: 'Техника',
      items: [],
      open: false,
      showAll: false,
    }, 
    size: {
      title: 'Размер',
      items: [],
      open: false,
      showAll: false,
    },  
    wall: {
      title: 'Стена',
      items: [],
      open: false,
      showAll: false,
    }, 
  })

  const keys = Object.keys(filters)

  useEffect(()=>{
    let newFilters = Object.assign({}, filters)
    function loadFilters(){
        keys.forEach(key=>{
          if(filtersPreloaded[key]){
            newFilters[key].items = [...filtersPreloaded[key]]
          }
        })
        newFilters.size.items = [{
          title: 'Маленькие (до 20 см)',
          slug: 'small',
          max: 20,
          id: 1
        },
        {
          title: 'Средние (20–40 см)',
          slug: 'medium',
          max: 40,
          id: 2
        },
        {
          title: 'Большие (40–60 см)',
          slug: 'large',
          max: 60,
          id: 3
        },
        {
          title: 'Огромные (от 60 см)',
          slug: 'huge',
          max: 1000,
          id: 4
        } ]
        for (const [key, value] of Object.entries(Router.query)) {
          if(newFilters[key]){ 
            newFilters[key].activeCount = 0;
            newFilters[key].items.forEach(item => {
              const qval = Router.query[key]
              if(Array.isArray(qval) && qval.findIndex((queryItem)=>{
                return item.slug === queryItem;
              }) > -1 || qval === item.slug){
                item.active = true;
                newFilters[key].open = true;
                newFilters[key].activeCount ++;
              }
            });
            sortByActive(newFilters[key].items)
          }
        }
        setFilters(newFilters)
    }
    loadFilters()
  }, [filtersPreloaded, router.query])

  function sortByActive(arr){
    arr.sort((a,b)=> a.active === b.active ? 0: a.active ? -1: 1)
  }

  function showAll(key){
    let newFilters = Object.assign({}, filters)
    newFilters[key].showAll = true;
    setFilters(newFilters);
  }

  function toggleCollapse(key){
    let newFilters = Object.assign({}, filters)
    newFilters[key].open = !newFilters[key].open;
    setFilters(newFilters);
  }

  function сheckboxClick(item, type){
    item.active = !item.active;
    // sortByActive(filters[type])
    let query = {};
    for (const [key, value] of Object.entries(filters)) {
      query[key] = filters[key].items.filter((item)=> item.active).map((item)=> item.slug)
    }
    onChange()
    const newQuery: Record<string, any> = Router.query ? Object.assign({}, Router.query, query) : query
    delete newQuery.page;
    Router.push({
      pathname: Router.pathname,
      query: newQuery
    })
  } 

  function getFilteredItems(key) {
    const q = (sectionSearch[key] || '').toLowerCase().trim()
    if (!q) return filters[key].items
    return filters[key].items.filter(item =>
      item.active || (item.title || item.title || '').toLowerCase().includes(q)
    )
  }

  function getMaxHeight(key){
    const ITEM_HEIGHT = 45;
    const SEARCH_HEIGHT = 48;
    const q = (sectionSearch[key] || '').trim()
    const items = getFilteredItems(key)
    const hasSearch = filters[key].items.length > SECTION_SEARCH_MIN
    const visibleCount = q ? items.length : (!filters[key].showAll ? Math.min(items.length, FILTER_ITEMS_NUM) : items.length)
    const showAllLink = !q && !filters[key].showAll && filters[key].items.length > FILTER_ITEMS_NUM ? 1 : 0
    const customSize = key === 'size' ? 84 : 0 // custom "свой размер" row
    return (filters[key].open && ((visibleCount + showAllLink) * ITEM_HEIGHT + (hasSearch ? SEARCH_HEIGHT : 0) + customSize)) || 0 + 'px'
  }

  return (
    <div className="catalog-filters">
      <div className="align-right">
        <div className="close-btn" onClick={() => hideFilters() }></div>
      </div>
      <div className="catalog-filters__search">
        <input
          type="text"
          className="catalog-filters__search-input"
          placeholder="Поиск по названию..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>
      <div className="catalog-filters__sections">
      {
        Object.keys(filters).map((key) => 
          <div className="catalog-filters__section" key={key}>
            <div className="catalog-filters__section-top" onClick={ ()=> toggleCollapse(key)}>
              <div className="catalog-filters__section-title">{filters[key].title}</div> 
              <div className="catalog-filters__section-expand-btn">
              {
                filters[key].open && 
                <svg className="minus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1"><path d="M0 0h10v1H0V0z" fill="#333"></path></svg>
              }
              {
                !filters[key].open && 
                <svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g fill="#333" fillRule="evenodd"><path d="M0 6h13v1H0z"></path><path d="M6 0h1v13H6z"></path></g></svg>
              }
              </div> 
            </div> 
            <div className="catalog-filters__collapsable" style={{ maxHeight: getMaxHeight(key) }}>
            {
              filters[key].items.length > SECTION_SEARCH_MIN && (
                <div className="catalog-filters__section-search">
                  <input
                    type="text"
                    className="catalog-filters__section-search-input"
                    placeholder={`Поиск по «${filters[key].title.toLowerCase()}»…`}
                    value={sectionSearch[key] || ''}
                    onChange={e => setSectionSearch(prev => ({ ...prev, [key]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              )
            }
            {
              (() => {
                const q = (sectionSearch[key] || '').trim()
                const items = getFilteredItems(key)
                const visible = q ? items : (!filters[key].showAll ? items.slice(0, FILTER_ITEMS_NUM) : items)
                return visible.map(item =>
                  <div className="catalog-filters__item" key={item.id}>
                    <div className={`checkbox ${item.active ? 'checkbox--active' : ''}`} onClick={() => сheckboxClick(item, key)}></div>
                    <div>{item.title || item.title}</div>
                  </div>
                )
              })()
            }
            {
              !(sectionSearch[key] || '').trim() && !filters[key].showAll && filters[key].items.length > FILTER_ITEMS_NUM &&
              <div className="catalog-filters__show-all" onClick={() => showAll(key)}>Показать все</div>
            }
            {
              key === 'size' && (
                <div className="catalog-filters__size-custom">
                  <div className="catalog-filters__size-custom-label">Свой размер (сторона, см)</div>
                  <div className="catalog-filters__price-row">
                    <input type="text" inputMode="numeric" placeholder="от"
                      className="catalog-filters__price-input"
                      value={sizeCustom.min}
                      onChange={e => handleSizeChange('min', e.target.value)}
                      onClick={e => e.stopPropagation()} />
                    <span className="catalog-filters__price-dash">—</span>
                    <input type="text" inputMode="numeric" placeholder="до"
                      className="catalog-filters__price-input"
                      value={sizeCustom.max}
                      onChange={e => handleSizeChange('max', e.target.value)}
                      onClick={e => e.stopPropagation()} />
                  </div>
                </div>
              )
            }
            </div>
          </div>
        )
      }
        <div className="catalog-filters__section">
          <div className="catalog-filters__section-top" onClick={() => setPriceOpen(!priceOpen)}>
            <div className="catalog-filters__section-title">Цена, ₽</div>
            <div className="catalog-filters__section-expand-btn">
            {
              priceOpen
                ? <svg className="minus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1"><path d="M0 0h10v1H0V0z" fill="#333"></path></svg>
                : <svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g fill="#333" fillRule="evenodd"><path d="M0 6h13v1H0z"></path><path d="M6 0h1v13H6z"></path></g></svg>
            }
            </div>
          </div>
          <div className="catalog-filters__collapsable" style={{ maxHeight: priceOpen ? '60px' : 0 }}>
            <div className="catalog-filters__price-row">
              <input
                type="text" inputMode="numeric" placeholder="от"
                className="catalog-filters__price-input"
                value={price.min}
                onChange={e => handlePriceChange('min', e.target.value)}
              />
              <span className="catalog-filters__price-dash">—</span>
              <input
                type="text" inputMode="numeric" placeholder="до"
                className="catalog-filters__price-input"
                value={price.max}
                onChange={e => handlePriceChange('max', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="align-center">
        <div className="btn hide-big" onClick={ () => hideFilters()}>Применить</div>
      </div>
    </div>
  )
}