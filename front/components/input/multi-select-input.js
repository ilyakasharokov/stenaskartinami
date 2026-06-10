import { useState, useEffect } from 'react'
import { API_HOST } from '@/constants/constants'
import { fetchStrapi } from '@/utils/strapi'

export default function MultiSelectInput({ endpoint, label, titleField = 'Title', onChange, aiNames = [] }) {
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    fetchStrapi(API_HOST + `/${endpoint}`).then(json => {
      const items = Array.isArray(json) ? json : []
      const unique = items.filter((a, i) => items.findIndex(b => b[titleField] === a[titleField]) === i)
      setOptions(unique.sort((a, b) => (a[titleField] < b[titleField] ? -1 : 1)))
    })
  }, [endpoint])

  // When AI suggests names, auto-select matching options
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

  return (
    <div className="form-input">
      <label>{label}</label>
      <div className="form-input__hints-wrapper">
        <div className="form-input__hints">
          {options.map(opt => (
            <div
              key={opt.id}
              className={`form-input__suggestion${selected.has(opt.id) ? ' active' : ''}`}
              onClick={() => toggle(opt.id)}
            >
              {opt[titleField]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
