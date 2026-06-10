import { useState, useEffect } from 'react'
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'

export default function MultiSelectInput({ endpoint, label, titleField = 'Title', onChange, aiNames = [] }) {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchStrapi(API_HOST + `/${endpoint}?pagination[limit]=200`).then(json => {
      const items = Array.isArray(json) ? json : []
      const unique = items.filter((a, i) => items.findIndex(b => b[titleField] === a[titleField]) === i)
      setOptions(unique.sort((a, b) => (a[titleField] < b[titleField] ? -1 : 1)))
    })
  }, [endpoint])

  useEffect(() => {
    if (!aiNames.length || !options.length) return
    const newSelected = new Set()
    for (const opt of options) {
      const name = (opt[titleField] || '').toLowerCase().trim()
      if (aiNames.some(n => name.includes(n.toLowerCase().trim()) || n.toLowerCase().trim().includes(name))) {
        newSelected.add(opt.id)
      }
    }
    if (newSelected.size > 0) {
      setSelected(newSelected)
      onChange([...newSelected])
    }
  }, [aiNames, options])

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      onChange([...next])
      return next
    })
  }

  function isAiMatch(opt) {
    if (!aiNames.length) return false
    const name = (opt[titleField] || '').toLowerCase().trim()
    return aiNames.some(n => name.includes(n.toLowerCase().trim()) || n.toLowerCase().trim().includes(name))
  }

  const filterLower = filter.toLowerCase()
  const selectedOptions = options.filter(opt => selected.has(opt.id))
  const availableOptions = options.filter(opt =>
    !selected.has(opt.id) &&
    (!filter || (opt[titleField] || '').toLowerCase().includes(filterLower))
  )

  return (
    <div className="ms-field">
      <label className="art-field__label">{label}</label>

      {/* Selected pills */}
      <div className="ms-selected">
        {selectedOptions.map(opt => (
          <span key={opt.id} className={`ms-pill${isAiMatch(opt) ? ' ms-pill--ai' : ''}`}>
            {isAiMatch(opt) && <span className="ms-pill__icon">✦</span>}
            {opt[titleField]}
            <button
              type="button"
              className="ms-pill__remove"
              onClick={() => toggle(opt.id)}
              aria-label={`Убрать ${opt[titleField]}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Search filter */}
      {options.length > 7 && (
        <div className="ms-search-wrap">
          <i className="ms-search-wrap__icon">⌕</i>
          <input
            type="text"
            placeholder={`Поиск…`}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      )}

      {/* Available chips */}
      <div className="ms-options">
        {availableOptions.map(opt => (
          <div
            key={opt.id}
            className={`ms-chip${isAiMatch(opt) ? ' ms-chip--ai-hint' : ''}`}
            onClick={() => toggle(opt.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle(opt.id)}
          >
            {opt[titleField]}
          </div>
        ))}
        {availableOptions.length === 0 && filter && (
          <span className="ms-empty-hint">Ничего не найдено по «{filter}»</span>
        )}
        {availableOptions.length === 0 && !filter && selectedOptions.length > 0 && (
          <span className="ms-empty-hint">Все варианты выбраны</span>
        )}
      </div>
    </div>
  )
}
