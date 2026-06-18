import Link from 'next/link'
import imageUrlBuilder from '@/utils/img-url-builder'

export default function ArtistCard({ artist }) {
  const coverUrl = artist.cover?.formats?.medium?.url || artist.cover?.formats?.small?.url || artist.cover?.url
  const avatarUrl = artist.avatar?.formats?.small?.url || artist.avatar?.formats?.thumbnail?.url || artist.avatar?.url

  const directions = Array.isArray(artist.directions) ? artist.directions : []
  const techniques = Array.isArray(artist.techniques) ? artist.techniques : []

  const location = [artist.city_name, artist.country].filter(Boolean).join(', ')
  const href = `/artists/${artist.slug}--${artist.id}`
  const worksCount = artist.works_count || 0

  return (
    <Link href={href} className="ac">
      <div className="ac__cover">
        {coverUrl
          ? <img src={imageUrlBuilder(coverUrl)} alt="" className="ac__cover-img" />
          : <div className="ac__cover-empty" />
        }
      </div>
      <div className="ac__body">
        <div className="ac__avatar-wrap">
          {avatarUrl
            ? <img src={imageUrlBuilder(avatarUrl)} alt={artist.full_name} className="ac__avatar-img" />
            : <span className="ac__avatar-initials">{(artist.full_name || '?')[0].toUpperCase()}</span>
          }
        </div>
        <div className="ac__info">
          <div className="ac__name">{artist.full_name}</div>
          {directions.length > 0 && (
            <div className="ac__dirs">{directions.slice(0, 2).join(', ')}</div>
          )}
          {location && (
            <div className="ac__loc">
              <svg width="11" height="13" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1C3.24 1 1 3.24 1 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z"/>
                <circle cx="6" cy="6" r="1.5"/>
              </svg>
              {location}
            </div>
          )}
          {worksCount > 0 && (
            <div className="ac__stats">
              <span className="ac__stat">{worksCount} <em>работ</em></span>
            </div>
          )}
          {techniques.length > 0 && (
            <div className="ac__tags">
              {techniques.slice(0, 3).map((t, i) => <span key={i} className="ac__tag">{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
