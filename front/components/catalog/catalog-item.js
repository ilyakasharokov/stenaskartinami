import imageUrlBuilder from '../../utils/img-url-builder'
import Link from 'next/link'

export default function CatalogItem({art, imageOnLoad}){
    return (
        <div className="catalog-item">
            <div className="catalog-item__wrapper">
                <div className="catalog-item__img-wrap">
                    <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <a title={art.Title}>
                        <img className="catalog-item__img" src={ imageUrlBuilder(art.Pictures[0].formats.small ? art.Pictures[0].formats.small.url: art.Pictures[0].formats.thumbnail.url) } alt={art.Title} onLoad={()=> {imageOnLoad()}}/>
                    </a>
                    </Link>
                </div>
                <Link href={ '/art/' + art.slug}>
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
                    { art.Price ? art.Price  + ' P' : ''} 
                    </div>
                </div>
            </div>
        </div>
    )
}