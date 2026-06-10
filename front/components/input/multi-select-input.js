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

  const filterLower = filter.toLowerCase()
  const visible = filter
    ? options.filter(opt => (opt[titleField] || '').toLowerCase().includes(filterLower))
    : options

  return (
    <div className="form-input">
      <label>{label}</label>
      {options.length > 8 && (
        <input
          type="text"
          className="multi-select-filter"
          placeholder={`Фильтр…`}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      )}
      <div className="form-input__hints-wrapper">
        <div className="form-input__hints">
          {visible.map(opt => (
            <div
              key={opt.id}
              className={`form-input__suggestion${selected.has(opt.id) ? ' active' : ''}`}
              onClick={() => toggle(opt.id)}
            >
              {opt[titleField]}
            </div>
          ))}
          {visible.length === 0 && filter && (
            <span className="multi-select-empty">Ничего не найдено</span>
          )}
        </div>
      </div>
    </div>
  )
}
