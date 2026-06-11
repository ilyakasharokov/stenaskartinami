import { useState, useEffect, useRef } from 'react'
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'

export default function MultiSelectInput({ endpoint, label, titleField = 'Title', onChange, aiNames = [], initialIds = [], initialDocumentIds = [] }) {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [custom, setCustom] = useState([]) // string[]
  const [filter, setFilter] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    fetchStrapi(API_HOST + `/${endpoint}?pagination[limit]=200`).then(json => {
      const items = Array.isArray(json) ? json : []
      const unique = items.filter((a, i) => items.findIndex(b => b[titleField] === a[titleField]) === i)
      setOptions(unique.sort((a, b) => (a[titleField] < b[titleField] ? -1 : 1)))
    })
  }, [endpoint])

  // Pre-select when options load (edit mode) — match by documentId first, then by id
  useEffect(() => {
    const hasInit = initialDocumentIds.length > 0 || initialIds.length > 0
    if (!hasInit || !options.length || initializedRef.current) return
    initializedRef.current = true
    let ids
    if (initialDocumentIds.length > 0) {
      ids = initialDocumentIds
        .map(docId => options.find(o => o.documentId === docId)?.id)
        .filter(Boolean)
    } else {
      ids = initialIds.filter(id => options.some(o => o.id === id))
    }
    setSelected(new Set(ids))
    onChange({ ids, custom: [] })
  }, [options, initialIds, initialDocumentIds])

  useEffect(() => {
    if (!aiNames.length || !options.length) return
    const newSelected = new Set()
    const matched = new Set()
    for (const opt of options) {
      const name = (opt[titleField] || '').toLowerCase().trim()
      const hit = aiNames.find(n => name.includes(n.toLowerCase().trim()) || n.toLowerCase().trim().includes(name))
      if (hit) { newSelected.add(opt.id); matched.add(hit.toLowerCase().trim()) }
    }
    const unmatched = aiNames.filter(n => !matched.has(n.toLowerCase().trim()))
    const newCustom = unmatched.filter(n => n.trim())
    setSelected(newSelected)
    setCustom(newCustom)
    onChange({ ids: [...newSelected], custom: newCustom })
  }, [aiNames, options])

  function notify(nextSelected, nextCustom) {
    onChange({ ids: [...nextSelected], custom: nextCustom })
  }

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      notify(next, custom)
      return next
    })
  }

  function addCustom(text) {
    const trimmed = text.trim()
    if (!trimmed || custom.includes(trimmed)) return
    const next = [...custom, trimmed]
    setCustom(next)
    notify(selected, next)
    setFilter('')
  }

  function removeCustom(text) {
    const next = custom.filter(c => c !== text)
    setCustom(next)
    notify(selected, next)
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
  const canAddCustom = filter.trim().length > 1 &&
    !options.some(o => (o[titleField] || '').toLowerCase() === filter.toLowerCase()) &&
    !custom.includes(filter.trim())

  return (
    <div className="ms-field">
      <label className="art-field__label">{label}</label>

      {/* Selected pills */}
      <div className="ms-selected">
        {selectedOptions.map(opt => (
          <span key={opt.id} className={`ms-pill${isAiMatch(opt) ? ' ms-pill--ai' : ''}`}>
            {isAiMatch(opt) && <span className="ms-pill__icon">✦</span>}
            {opt[titleField]}
            <button type="button" className="ms-pill__remove" onClick={() => toggle(opt.id)}>×</button>
          </span>
        ))}
        {custom.map(text => (
          <span key={text} className="ms-pill ms-pill--custom">
            {text}
            <button type="button" className="ms-pill__remove" onClick={() => removeCustom(text)}>×</button>
          </span>
        ))}
      </div>

      {/* Search / add input */}
      <div className="ms-search-wrap">
        <i className="ms-search-wrap__icon">⌕</i>
        <input
          type="text"
          placeholder={`Поиск или свой вариант…`}
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              if (canAddCustom) addCustom(filter)
            }
          }}
        />
      </div>

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
        {canAddCustom && (
          <div
            className="ms-chip ms-chip--add"
            onClick={() => addCustom(filter)}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && addCustom(filter)}
          >
            + Добавить «{filter.trim()}»
          </div>
        )}
        {availableOptions.length === 0 && !canAddCustom && !filter && selectedOptions.length > 0 && (
          <span className="ms-empty-hint">Все варианты выбраны</span>
        )}
      </div>
    </div>
  )
}
