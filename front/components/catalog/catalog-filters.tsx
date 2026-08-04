import { useState, useEffect, useRef } from 'react'
import { useRouter } from "next/router";
import Router from 'next/router'
import Preloader from '../preloader/preloader';
import { setPendingScroll } from '@/utils/catalog-scroll';

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
      pushKeepScroll({ pathname: Router.pathname, query: newQuery });
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
      pushKeepScroll({ pathname: Router.pathname, query: newQuery });
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
      pushKeepScroll({ pathname: Router.pathname, query: newQuery });
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
    orientation: {
      title: 'Ориентация',
      items: [],
      open: false,
      showAll: true,
    },
    color: {
      title: 'Цвет',
      items: [],
      open: false,
      showAll: true,
    },
    tone: {
      title: 'Тон',
      items: [],
      open: false,
      showAll: true,
    },
    size: {
      title: 'Размер',
      items: [],
      open: false,
      showAll: false,
    },
    availability: {
      title: 'Наличие',
      items: [],
      open: false,
      showAll: true,
    },
    wall: {
      title: 'Стена',
      items: [],
      open: false,
      showAll: false,
    },
  })

  // Navigate without the page jumping to the top: keep scroll, and restore it
  // once the new results have rendered (SSR nav + arts area reflow can otherwise
  // clamp the scroll position).
  function pushKeepScroll(urlObj) {
    if (typeof window !== 'undefined') setPendingScroll(window.scrollY)
    Router.push(urlObj, undefined, { scroll: false })
  }

  const keys = Object.keys(filters)

  // Static option groups don't need an inner search box, even if they have many items (colours).
  const STATIC_KEYS = new Set(['size', 'orientation', 'color', 'tone', 'availability'])
  const hasSectionSearch = (key) => filters[key].items.length > SECTION_SEARCH_MIN && !STATIC_KEYS.has(key)

  // Visual sections. Some combine several filter keys into labelled sub-lists.
  // (Наличие is intentionally omitted for now.)
  const SECTIONS = [
    { title: 'Стиль',           keys: ['styles'] },
    { title: 'Теги',            keys: ['subjects'] },
    { title: 'Техника',         keys: ['mediums'] },
    { title: 'Цвет и тон',      keys: ['color', 'tone'],       labels: { color: 'Цвет', tone: 'Тон' } },
    { title: 'Размер и формат', keys: ['size', 'orientation'], labels: { size: 'Размер', orientation: 'Ориентация' } },
    { title: 'Стена',           keys: ['wall'] },
  ]

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
        newFilters.orientation.items = [
          { title: 'Вертикальные', slug: 'portrait', id: 'or1' },
          { title: 'Горизонтальные', slug: 'landscape', id: 'or2' },
          { title: 'Квадратные', slug: 'square', id: 'or3' },
        ]
        newFilters.availability.items = [
          { title: 'В наличии', slug: 'available', id: 'av1' },
          { title: 'Продано', slug: 'sold', id: 'av2' },
        ]
        newFilters.color.items = [
          { title: 'Красный', slug: 'red', hex: '#d94436', id: 'c1' },
          { title: 'Оранжевый', slug: 'orange', hex: '#e8873b', id: 'c2' },
          { title: 'Жёлтый', slug: 'yellow', hex: '#e8c53b', id: 'c3' },
          { title: 'Зелёный', slug: 'green', hex: '#4a9d5b', id: 'c4' },
          { title: 'Синий', slug: 'blue', hex: '#3b6fe8', id: 'c5' },
          { title: 'Фиолетовый', slug: 'purple', hex: '#8b5cd6', id: 'c6' },
          { title: 'Розовый', slug: 'pink', hex: '#e07aa8', id: 'c7' },
          { title: 'Коричневый', slug: 'brown', hex: '#8a5a3b', id: 'c8' },
          { title: 'Бежевый', slug: 'beige', hex: '#d8c3a5', id: 'c9' },
          { title: 'Чёрный', slug: 'black', hex: '#2b2b2b', id: 'c10' },
          { title: 'Белый', slug: 'white', hex: '#f2f2f0', id: 'c11' },
          { title: 'Серый', slug: 'gray', hex: '#9a9a9a', id: 'c12' },
        ]
        newFilters.tone.items = [
          { title: 'Светлые', slug: 'light', id: 't1' },
          { title: 'Тёмные', slug: 'dark', id: 't2' },
          { title: 'Яркие', slug: 'vivid', id: 't3' },
          { title: 'Пастельные', slug: 'pastel', id: 't4' },
        ]
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
    pushKeepScroll({ pathname: Router.pathname, query: newQuery })
  }

  function getFilteredItems(key) {
    const q = (sectionSearch[key] || '').toLowerCase().trim()
    if (!q) return filters[key].items
    return filters[key].items.filter(item =>
      item.active || (item.title || item.title || '').toLowerCase().includes(q)
    )
  }

  function keyHeight(key){
    const ITEM_HEIGHT = 45;
    const SEARCH_HEIGHT = 48;
    const q = (sectionSearch[key] || '').trim()
    const items = getFilteredItems(key)
    const hasSearch = hasSectionSearch(key)
    const visibleCount = q ? items.length : (!filters[key].showAll ? Math.min(items.length, FILTER_ITEMS_NUM) : items.length)
    const showAllLink = !q && !filters[key].showAll && filters[key].items.length > FILTER_ITEMS_NUM ? 1 : 0
    const customSize = key === 'size' ? 84 : 0 // custom "свой размер" row
    return (visibleCount + showAllLink) * ITEM_HEIGHT + (hasSearch ? SEARCH_HEIGHT : 0) + customSize
  }

  // Combined sections (e.g. "Цвет и тон") render several filter keys as labelled
  // sub-lists — each key keeps its own query param, so the dimensions AND together.
  function sectionHeight(section){
    if (!filters[section.keys[0]].open) return 0
    const SUBLABEL = 34
    return section.keys.reduce((sum, key) => sum + keyHeight(key) + (section.labels && section.labels[key] ? SUBLABEL : 0), 0)
  }

  function toggleSection(section){
    const newFilters = Object.assign({}, filters)
    const next = !newFilters[section.keys[0]].open
    section.keys.forEach(k => { newFilters[k].open = next })
    setFilters(newFilters)
  }

  function renderKeyBody(key){
    const q = (sectionSearch[key] || '').trim()
    const items = getFilteredItems(key)
    const visible = q ? items : (!filters[key].showAll ? items.slice(0, FILTER_ITEMS_NUM) : items)
    return (
      <>
        {hasSectionSearch(key) && (
          <div className="catalog-filters__section-search">
            <input type="text" className="catalog-filters__section-search-input"
              placeholder={`Поиск по «${filters[key].title.toLowerCase()}»…`}
              value={sectionSearch[key] || ''}
              onChange={e => setSectionSearch(prev => ({ ...prev, [key]: e.target.value }))}
              onClick={e => e.stopPropagation()} />
          </div>
        )}
        {visible.map(item =>
          <div className="catalog-filters__item" key={item.id}>
            <div className={`checkbox ${item.active ? 'checkbox--active' : ''}`} onClick={() => сheckboxClick(item, key)}></div>
            <div>{item.hex && <span className="catalog-filters__swatch" style={{ background: item.hex }} />}{item.title}</div>
          </div>
        )}
        {!q && !filters[key].showAll && filters[key].items.length > FILTER_ITEMS_NUM &&
          <div className="catalog-filters__show-all" onClick={() => showAll(key)}>Показать все</div>}
        {key === 'size' && (
          <div className="catalog-filters__size-custom">
            <div className="catalog-filters__size-custom-label">Свой размер (сторона, см)</div>
            <div className="catalog-filters__price-row">
              <input type="text" inputMode="numeric" placeholder="от" className="catalog-filters__price-input"
                value={sizeCustom.min} onChange={e => handleSizeChange('min', e.target.value)} onClick={e => e.stopPropagation()} />
              <span className="catalog-filters__price-dash">—</span>
              <input type="text" inputMode="numeric" placeholder="до" className="catalog-filters__price-input"
                value={sizeCustom.max} onChange={e => handleSizeChange('max', e.target.value)} onClick={e => e.stopPropagation()} />
            </div>
          </div>
        )}
      </>
    )
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
        SECTIONS.map((section) => {
          const open = filters[section.keys[0]].open
          return (
          <div className="catalog-filters__section" key={section.title}>
            <div className="catalog-filters__section-top" onClick={() => toggleSection(section)}>
              <div className="catalog-filters__section-title">{section.title}</div>
              <div className="catalog-filters__section-expand-btn">
              {
                open &&
                <svg className="minus" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 1"><path d="M0 0h10v1H0V0z" fill="#333"></path></svg>
              }
              {
                !open &&
                <svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg"><g fill="#333" fillRule="evenodd"><path d="M0 6h13v1H0z"></path><path d="M6 0h1v13H6z"></path></g></svg>
              }
              </div>
            </div>
            <div className="catalog-filters__collapsable" style={{ maxHeight: sectionHeight(section) + 'px' }}>
            {
              section.keys.map((key) => (
                <div key={key}>
                  {section.labels && section.labels[key] &&
                    <div className="catalog-filters__subtitle">{section.labels[key]}</div>}
                  {renderKeyBody(key)}
                </div>
              ))
            }
            </div>
          </div>
          )
        })
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