import Head from 'next/head'
import Link from 'next/link'
import MainLayout from '@/components/layouts/MainLayout'
import { API_HOST } from "@/constants/constants"
import imageUrlBuilder from '@/utils/img-url-builder'
import { useState } from 'react'
import serialize from '@/utils/serialize'
import { fetchStrapi } from '@/utils/strapi'
import ProductListItem from '@/components/catalog/product-list-item'
import AddFavorite from '@/components/art/add-favorite'
import dynamic from 'next/dynamic'

const YandexMap = dynamic(() => import('@/components/YandexMap'), { ssr: false });

const formatPrice = (price) => {
  if (!price) return '';
  return price.toLocaleString('ru-RU') + ' ₽';
};

const getArtImageUrl = (art) => {
  if (!Array.isArray(art?.Pictures) || !art.Pictures[0]) return null;
  const picture = art.Pictures[0];
  if (picture.formats) {
    return picture.formats.medium?.url || picture.formats.large?.url || picture.formats.small?.url || picture.url || null;
  }
  return picture.url || null;
};

export default function Home({ walls, arts, interiorArts, artists }) {
  const [currentSlide, setSlide] = useState(0);
  const heroArts = arts.slice(0, 4);
  const featuredArts = arts.slice(0, 5);

  const next = () => setSlide(s => (s + 1) % Math.max(heroArts.length, 1));
  const prev = () => setSlide(s => (s - 1 + Math.max(heroArts.length, 1)) % Math.max(heroArts.length, 1));

  const currentArt = heroArts[currentSlide] || null;

  return (
    <MainLayout>
      <Head>
        <title>Картины: купить искусство онлайн | Стена с картинами, облачная галерея</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="index-page">

        {/* ── Hero ── */}
        <section className="index-hero">
          <div className="index-hero__left">
            <h1 className="index-hero__title">Откройте современное искусство</h1>
            <p className="index-hero__subtitle">
              Покупайте картины напрямую у художников и поддерживайте талант.
            </p>
            <div className="index-hero__stats">
              <div className="index-hero__stat">
                <div className="index-hero__stat-num">1200+</div>
                <div className="index-hero__stat-label">работ</div>
              </div>
              <div className="index-hero__stat">
                <div className="index-hero__stat-num">340+</div>
                <div className="index-hero__stat-label">художников</div>
              </div>
              <div className="index-hero__stat">
                <div className="index-hero__stat-num">180+</div>
                <div className="index-hero__stat-label">продаж</div>
              </div>
              <div className="index-hero__stat">
                <div className="index-hero__stat-num">18</div>
                <div className="index-hero__stat-label">городов</div>
              </div>
            </div>
            <div className="index-hero__ctas">
              <Link href="/catalog" className="btn index-hero__btn-primary">Смотреть каталог →</Link>
              <Link href="/account/add-art" className="index-hero__btn-outline">Добавить работу</Link>
            </div>
          </div>

          <div className="index-hero__right">
            {heroArts.length > 0 && (
              <div className="hero-slider">
                <div className="hero-slider__track">
                  {heroArts.map((art, i) => (
                    <div key={art.id} className={`hero-slider__slide ${i === currentSlide ? 'active' : ''}`}>
                      {getArtImageUrl(art) && (
                        <Link href={'/art/' + art.slug + '--' + art.id}>
                          <img
                            src={imageUrlBuilder(getArtImageUrl(art))}
                            alt={art.Title}
                            className="hero-slider__img"
                          />
                        </Link>
                      )}
                    </div>
                  ))}

                  {currentArt && (
                    <div className="hero-slider__card">
                      <div className="hero-slider__card-row">
                        <Link
                          href={'/art/' + currentArt.slug + '--' + currentArt.id}
                          className="hero-slider__card-title"
                        >
                          {currentArt.Title}
                        </Link>
                        <AddFavorite art={currentArt} />
                      </div>
                      {(currentArt.width || currentArt.height || currentArt.mediums?.length > 0) && (
                        <div className="hero-slider__card-meta">
                          {currentArt.width && currentArt.height
                            ? `${currentArt.width} × ${currentArt.height} см`
                            : ''}
                          {currentArt.mediums?.length > 0 && (
                            <span>
                              {currentArt.width || currentArt.height ? ' • ' : ''}
                              {currentArt.mediums.map(m => m.name).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                      {currentArt.Artist && (
                        <div className="hero-slider__card-artist">
                          {currentArt.Artist.full_name}
                          {currentArt.Year && `, ${new Date(currentArt.Year).getFullYear()}`}
                        </div>
                      )}
                      {currentArt.Price > 0 && (
                        <div className="hero-slider__card-price">{formatPrice(currentArt.Price)}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="hero-slider__nav">
                  <div className="hero-slider__dots">
                    {heroArts.map((_, i) => (
                      <button
                        key={i}
                        className={`hero-slider__dot ${i === currentSlide ? 'active' : ''}`}
                        onClick={() => setSlide(i)}
                        aria-label={`Слайд ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="hero-slider__arrows">
                    <button className="hero-slider__arrow" onClick={prev} aria-label="Назад">
                      <svg viewBox="0 0 8 14" width="8" height="14" fill="none">
                        <path d="M7 1L1 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button className="hero-slider__arrow" onClick={next} aria-label="Вперёд">
                      <svg viewBox="0 0 8 14" width="8" height="14" fill="none">
                        <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Featured Arts ── */}
        {featuredArts.length > 0 && (
          <section className="index-section">
            <div className="index-section__header">
              <h2>Избранные работы</h2>
              <Link href="/catalog" className="index-section__more">Смотреть все работы →</Link>
            </div>
            <div className="product-list index-featured-arts">
              {featuredArts.map(art => (
                <ProductListItem art={art} key={art.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── Interiors ── */}
        {interiorArts.length > 0 && (
          <section className="index-section">
            <div className="index-section__header">
              <h2>Как картины выглядят в интерьере</h2>
              <Link href="/catalog" className="index-section__more">Смотреть все интерьеры →</Link>
            </div>
            <div className="index-interiors">
              {interiorArts.map(art => (
                <Link
                  href={'/art/' + art.slug + '--' + art.id}
                  key={art.id}
                  className="index-interiors__item"
                >
                  <img src={imageUrlBuilder(art.interior_photo?.url)} alt={art.Title} />
                  <div className="index-interiors__hover">
                    <AddFavorite art={art} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Artists ── */}
        {artists.length > 0 && (
          <section className="index-section">
            <div className="index-section__header">
              <h2>Художники</h2>
              <Link href="/artists" className="index-section__more">Смотреть всех художников →</Link>
            </div>
            <div className="index-artists">
              {artists.slice(0, 7).map(artist => (
                <Link
                  href={'/artists/' + artist.slug + '--' + artist.id}
                  key={artist.id}
                  className="index-artists__item"
                >
                  <div className="index-artists__photo">
                    {artist.photos?.[0]?.url ? (
                      <img src={imageUrlBuilder(artist.photos[0].url)} alt={artist.full_name} />
                    ) : (
                      <span className="index-artists__initials">
                        {(artist.full_name || '').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="index-artists__name">{artist.full_name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom: Map + Artist CTA ── */}
        <div className="index-bottom">
          <div className="index-bottom__map-card">
            <h3>Стены на карте</h3>
            <p>Находите выставленные работы в кафе, барах и пространствах вашего города.</p>
            <div className="index-bottom__map-wrap">
              <YandexMap walls={walls} mapOnly />
            </div>
            <Link href="/walls" className="index-bottom__outline-btn">Смотреть на карте</Link>
          </div>

          <div className="index-bottom__cta-card">
            <h3>Вы художник?</h3>
            <p>Загрузите работу за 2 минуты и покажите её тысячам любителей искусства.</p>
            <ul className="index-cta__list">
              <li>Бесплатная публикация</li>
              <li>Без комиссии за размещение</li>
              <li>Модерация за 1–2 дня</li>
            </ul>
            <div className="index-cta__stats">
              <div className="index-cta__stat">
                <div className="index-cta__stat-num">1200+</div>
                <div className="index-cta__stat-label">работ</div>
              </div>
              <div className="index-cta__stat">
                <div className="index-cta__stat-num">340+</div>
                <div className="index-cta__stat-label">художников</div>
              </div>
              <div className="index-cta__stat">
                <div className="index-cta__stat-num">180+</div>
                <div className="index-cta__stat-label">успешных продаж</div>
              </div>
              <div className="index-cta__stat">
                <div className="index-cta__stat-num">18</div>
                <div className="index-cta__stat-label">городов</div>
              </div>
            </div>
            <Link href="/account/add-art" className="btn">Добавить работу</Link>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

export const getServerSideProps = async () => {
  try {
    const [wallsJson, artsJson, intJson, artistsJson] = await Promise.all([
      fetchStrapi(
        API_HOST +
          '/walls' +
          serialize({
            populate: {
              Images: true,
              arts: {
                populate: ['Pictures', 'Artist'],
              },
            },
            populateDefaults: [],
          })
      ),
      fetchStrapi(
        API_HOST +
          '/arts' +
          serialize({
            _start: 0,
            _limit: 8,
            main: true,
            populate: ['Pictures', 'Artist', 'styles', 'subjects', 'mediums', 'wall'],
          })
      ),
      fetchStrapi(
        API_HOST +
          '/arts?filters[interior_photo][$notNull]=true&pagination[pageSize]=6&populate[0]=interior_photo&populate[1]=Pictures&populate[2]=Artist&sort=publishedAt:desc'
      ).catch(() => null),
      fetchStrapi(
        API_HOST +
          '/artists' +
          serialize({ _limit: 8, populate: { photos: true }, populateDefaults: [] })
      ).catch(() => null),
    ]);

    const walls = Array.isArray(wallsJson) ? wallsJson : [];
    walls.forEach(wall => {
      const wallArts = Array.isArray(wall.arts) ? wall.arts : [];
      wall.arts = wallArts.sort((a, b) => {
        const aP = a.publishedAt || a.published_at;
        const bP = b.publishedAt || b.published_at;
        return aP < bP ? 1 : -1;
      });
    });

    const arts = (Array.isArray(artsJson) ? artsJson : []).sort((a, b) => {
      const aP = a.publishedAt || a.published_at;
      const bP = b.publishedAt || b.published_at;
      return aP < bP ? 1 : -1;
    });

    return {
      props: {
        walls,
        arts,
        interiorArts: Array.isArray(intJson) ? intJson : [],
        artists: Array.isArray(artistsJson) ? artistsJson : [],
      },
    };
  } catch {
    return {
      props: { walls: [], arts: [], interiorArts: [], artists: [] },
    };
  }
};
