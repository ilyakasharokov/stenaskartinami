import { useState, useEffect, useRef, useCallback } from 'react'
import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps'

// ── Nominatim search (no API key needed) ─────────────────────────────────────

async function nominatimSearch(query, onlyCity = false) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    countrycodes: 'ru,by,kz,ua',
    limit: '6',
    addressdetails: '1',
    ...(onlyCity ? { featuretype: 'city' } : {}),
  })
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'Accept-Language': 'ru,en', 'User-Agent': 'stenaskartinami.com' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.map(item => {
      // Build short label: "Улица, Город" or "Город, Страна"
      const a = item.address || {}
      const parts = [
        a.road || a.pedestrian || a.amenity || a.building,
        a.house_number,
        a.city || a.town || a.village || a.municipality,
        a.state,
      ].filter(Boolean)
      const label = parts.length >= 2 ? parts.join(', ') : item.display_name.split(', ').slice(0, 3).join(', ')
      return { label, coords: [parseFloat(item.lat), parseFloat(item.lon)] }
    })
  } catch {
    return []
  }
}

// ── AddressInput ──────────────────────────────────────────────────────────────

export default function AddressInput({
  value, onChange, onSelect,
  placeholder = 'Начните вводить адрес…',
  inputClassName = 'aw-input',
  error,
  showMap = true,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]   = useState(false)
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)

  const wrapRef = useRef(null)
  const debRef  = useRef(null)

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    onChange(val)
    if (debRef.current) clearTimeout(debRef.current)

    if (!val || val.length < 3) { setSuggestions([]); setOpen(false); return }

    debRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await nominatimSearch(val)
      setLoading(false)
      setSuggestions(results)
      setOpen(results.length > 0)
    }, 400)
  }, [onChange])

  const handleSelect = useCallback((item) => {
    onChange(item.label)
    setSuggestions([])
    setOpen(false)
    setCoords(item.coords)
    onSelect?.(item.label, item.coords)
  }, [onChange, onSelect])

  const clear = useCallback(() => {
    onChange('')
    setSuggestions([])
    setCoords(null)
    setOpen(false)
    onSelect?.('', null)
  }, [onChange, onSelect])

  return (
    <div ref={wrapRef} className="addr-wrap">
      <div className="addr-row">
        <input
          className={`${inputClassName}${error ? ' aw-input--err' : ''} addr-input`}
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {value && (
          <button type="button" className="addr-clear" onClick={clear} tabIndex={-1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {loading && <span className="addr-loading" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="addr-suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li key={i} role="option">
              <button
                type="button"
                className="addr-suggestion-item"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              >
                <svg className="addr-suggestion-pin" width="13" height="16" viewBox="0 0 13 16" fill="none">
                  <path d="M6.5 0C3.46 0 1 2.46 1 5.5 1 9.63 6.5 16 6.5 16S12 9.63 12 5.5C12 2.46 9.54 0 6.5 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#ccc"/>
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showMap && (
        <div className="addr-map-box">
          {coords ? (
            <>
              <YMaps>
                <Map
                  key={coords.join(',')}
                  defaultState={{ center: coords, zoom: 16 }}
                  style={{ width: '100%', height: '200px' }}
                  options={{ suppressMapOpenBlock: true }}
                >
                  <ZoomControl />
                  <Placemark geometry={coords} options={{ preset: 'islands#redIcon' }} />
                </Map>
              </YMaps>
              <div className="addr-map-status">
                <span className="addr-map-ok">
                  <svg width="8" height="8"><circle cx="4" cy="4" r="4" fill="#4caf50"/></svg>
                  Адрес отмечен на карте
                </span>
                <button type="button" className="addr-map-edit" onClick={clear}>Изменить</button>
              </div>
            </>
          ) : (
            <div className="addr-map-placeholder">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill="#eee" stroke="none"/>
              </svg>
              <span>Выберите адрес из списка — появится карта</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── CityInput ─────────────────────────────────────────────────────────────────

export function CityInput({ value, onChange, placeholder = 'Например: Москва', className = '' }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]   = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const debRef  = useRef(null)

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleChange = useCallback((e) => {
    const val = e.target.value
    onChange(val)
    if (debRef.current) clearTimeout(debRef.current)

    if (!val || val.length < 2) { setSuggestions([]); setOpen(false); return }

    debRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await nominatimSearch(val, true)
      setLoading(false)
      // For city field: prefer city-level results (shorter display names)
      const cities = results.map(r => {
        const parts = r.label.split(', ')
        // Return just "Город, Страна" format
        return parts.slice(0, 2).join(', ')
      }).filter((v, i, a) => a.indexOf(v) === i) // dedupe
      setSuggestions(cities.slice(0, 6))
      setOpen(cities.length > 0)
    }, 350)
  }, [onChange])

  const handleSelect = (city) => {
    onChange(city)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="addr-wrap addr-wrap--city">
      <div className="addr-row">
        <input
          className={`prof-input ${className}`}
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={100}
        />
        {value && (
          <button type="button" className="addr-clear" onClick={() => { onChange(''); setSuggestions([]) }} tabIndex={-1}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        {loading && <span className="addr-loading" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="addr-suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li key={i} role="option">
              <button
                type="button"
                className="addr-suggestion-item"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              >
                <svg className="addr-suggestion-pin" width="13" height="16" viewBox="0 0 13 16" fill="none">
                  <path d="M6.5 0C3.46 0 1 2.46 1 5.5 1 9.63 6.5 16 6.5 16S12 9.63 12 5.5C12 2.46 9.54 0 6.5 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="#ccc"/>
                </svg>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
