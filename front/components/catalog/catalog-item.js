import imageUrlBuilder from '@/utils/img-url-builder'
import Link from 'next/link'
import AddFavorite from '../art/add-favorite'

const getPictureUrl = (art) => {
  if (!Array.isArray(art?.Pictures) || !art.Pictures[0]) return null;
  const picture = art.Pictures[0];
  if (picture.formats) {
    return (
      picture.formats.medium?.url ||
      picture.formats.small?.url ||
      picture.formats.thumbnail?.url ||
      null
    );
  }
  return picture.url || null;
};

export default function CatalogItem({art, imageOnLoad}){
    return (
        <div className="catalog-item">
            <div className="catalog-item__wrapper">
                {
                    getPictureUrl(art) &&
                    <div className="catalog-item__img-wrap">
                        {
                            (art.publishedAt || art.published_at) &&
                            <div className="catalog-item__btns">
                                <AddFavorite art={art}></AddFavorite>    
                            </div>
                        }
                        <div className="overlay"></div>
                        <Link href={ '/art/' + art.slug + '--' + art.id}>
                        <a className="catalog-item__img-link" title={art.Title}>
                            <img
                              className="catalog-item__img"
                              src={imageUrlBuilder(getPictureUrl(art))}
                              alt={art.Title}
                              onLoad={()=> {imageOnLoad()}}
                            />
                        </a>
                        </Link>
                    </div>
                }
                <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <div className="catalog-item__title"><a title={art.Title}>{art.Title}</a></div>
                </Link>
                { 
                    art.width && art.height &&
                    <div className="catalog-item__size">{art.width} x {art.height}</div>
                }
                <div className="catalog-item__artist-price">
                    { 
                    art.Artist && 
                    <div className="catalog-item__artist">
                        {
                        art.Artist.full_name && 
                        <Link href={ '/artists/' + art.Artist.slug + '--' + art.Artist.id}><a title={art.Artist.full_name}>{art.Artist.full_name}</a></Link> 
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
    )
}