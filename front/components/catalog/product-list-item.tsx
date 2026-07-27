import imageUrlBuilder from '@/utils/img-url-builder'
import Link from 'next/link'
import AddFavorite from '../art/add-favorite'

const getPictureUrl = (art) => {
  if (!Array.isArray(art?.Pictures) || !art.Pictures[0]) return null;
  const picture = art.Pictures[0];
  if (picture.formats) {
    return (
      picture.formats.small?.url ||
      picture.formats.thumbnail?.url ||
      picture.formats.medium?.url ||
      null
    );
  }
  return picture.url || null;
};

export default function ProductListItem({art}){
    return (
      <>
        <div className={`catalog-item ${art.sold ? 'sold': ''}`} key={art.id}>
              
              <div className="catalog-item__wrapper">
                <div className="catalog-item__img-wrap">
                <div className="catalog-item__btns">
                  <AddFavorite art={art}></AddFavorite>    
                </div>
                
                  <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <div>
                    <div className="overlay"></div>
                      <div>
                        {
                          getPictureUrl(art) &&
                          <div
                            className="catalog-item__bg-img"
                            style={{
                              backgroundImage: `url(${imageUrlBuilder(getPictureUrl(art))})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <img className="catalog-item__invisible-img" src="/favicon.png"/>
                          </div>
                        }
                      </div>
                    </div>
                  </Link>
                </div>
                <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <div className="catalog-item__title">{art.Title}</div>
                </Link>
                <div className="catalog-item__size">
                { 
                  art.width && art.height &&
                  <div>
                    {art.width} x {art.height}
                  </div>
                }
                </div>
                <div className="catalog-item__artist-price">
                  { 
                    art.Artist && 
                    <div className="catalog-item__artist">
                      {
                        art.Artist.full_name && 
                        <Link href={ '/artists/' + art.Artist.slug + '--' + art.Artist.id} title={art.Artist.full_name}>{art.Artist.full_name}</Link>
                      }
                      {
                        art.Artist.full_name && art.Year &&
                        <span>, </span>
                      }
                      {
                        art.Year && 
                        <span>{ (new Date(art.Year)).getFullYear()}</span>
                      }
                    </div>
                  }
                  <div className="catalog-item__price">
                    { art.sold ? 'ПРОДАНО' : art.Price ? art.Price  + ' P' : ''} 
                  </div>
                </div>
              </div>
            </div>
      </>
    )
}