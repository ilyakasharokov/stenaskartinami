export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100
  const r = abs % 10
  if (abs >= 11 && abs <= 19) return many
  if (r === 1) return one
  if (r >= 2 && r <= 4) return few
  return many
}

export const pluralWorks      = (n) => plural(n, 'работа',      'работы',      'работ')
export const pluralWalls      = (n) => plural(n, 'стена',       'стены',       'стен')
export const pluralFollowers  = (n) => plural(n, 'подписчик',   'подписчика',  'подписчиков')
export const pluralArtists    = (n) => plural(n, 'художник',    'художника',   'художников')
export const pluralSold       = (n) => plural(n, 'продана',     'продано',     'продано')
