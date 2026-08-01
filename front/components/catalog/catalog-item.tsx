import { useRef, useCallback } from 'react'
import Image from 'next/image'
import imageUrlBuilder, { imagePath } from '@/utils/img-url-builder'
import Link from 'next/link'
import AddFavorite from '../art/add-favorite'
import { Eye, Heart } from '../ui/icons'

// Card is ~25vw in a 4-col grid, wider on tablet/mobile
const CARD_SIZES = '(max-width: 700px) 50vw, (max-width: 1200px) 33vw, 25vw'

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

const markLoaded = (img) => {
  img.classList.add('catalog-item__img--loaded');
  img.closest('.catalog-item__img-wrap')?.classList.add('catalog-item__img-wrap--loaded');
};

export default function CatalogItem({art, imageOnLoad}){
    const pic = Array.isArray(art?.Pictures) ? art.Pictures[0] : null;
    const picUrl = getPictureUrl(art);
    const imgW = pic?.width;
    const imgH = pic?.height;
    const imageOnLoadRef = useRef(imageOnLoad);
    imageOnLoadRef.current = imageOnLoad;

    const imgRefCallback = useCallback(node => {
        if (!node) return;
        if (node.complete) {
            markLoaded(node);
            if (node.naturalWidth > 0) imageOnLoadRef.current?.();
            return;
        }
        const onDone = (ok) => {
            markLoaded(node);
            if (ok) imageOnLoadRef.current?.();
            node.removeEventListener('load', onSuccess);
            node.removeEventListener('error', onFailure);
        };
        const onSuccess = () => onDone(true);
        const onFailure = () => onDone(false);
        node.addEventListener('load', onSuccess);
        node.addEventListener('error', onFailure);
    }, []);

    return (
        <div className="catalog-item">
            <div className="catalog-item__wrapper">
                {
                    picUrl &&
                    <div className="catalog-item__img-wrap" style={imgW && imgH ? { aspectRatio: `${imgW} / ${imgH}` } : undefined}>
                        {
                            (art.publishedAt || art.published_at) &&
                            <div className="catalog-item__btns">
                                <AddFavorite art={art}></AddFavorite>
                            </div>
                        }
                        <div className="overlay"></div>
                        <Link href={ '/art/' + art.slug + '--' + art.id} className="catalog-item__img-link" title={art.Title}>
                            {
                              imgW && imgH
                                ? <Image
                                    ref={imgRefCallback}
                                    className="catalog-item__img"
                                    src={imagePath(picUrl)}
                                    alt={art.Title || ''}
                                    width={imgW}
                                    height={imgH}
                                    sizes={CARD_SIZES}
                                    onLoad={e => { markLoaded(e.currentTarget); imageOnLoadRef.current?.(); }}
                                  />
                                : <img
                                    ref={imgRefCallback}
                                    className="catalog-item__img"
                                    src={imageUrlBuilder(picUrl)}
                                    alt={art.Title}
                                  />
                            }
                        </Link>
                    </div>
                }
                <Link href={ '/art/' + art.slug + '--' + art.id}>
                    <div className="catalog-item__title">{art.Title}</div>
                </Link>
                {
                    art.width && art.height &&
                    <div className="catalog-item__size">{art.width} x {art.height}</div>
                }
                {
                    (art.views > 0 || art.likes_count > 0) &&
                    <div className="catalog-item__stats">
                        {art.views > 0 && <span title="Просмотры"><Eye size={13} /> {art.views}</span>}
                        {art.likes_count > 0 && <span title="Лайки"><Heart size={13} filled /> {art.likes_count}</span>}
                    </div>
                }
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
    )
}
