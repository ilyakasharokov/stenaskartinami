import { useEffect, useState } from 'react'
import imageUrlBuilder from '@/utils/img-url-builder'

export default function ImageGallery({images}){
    const normalizedImages = Array.isArray(images) ? images : [];
    const [currentPicture, setPicture] = useState({
      index: 0,
      img: normalizedImages[0] || null,
    })
  
    useEffect(()=>{
      setPicture({index: 0, img: normalizedImages[0] || null})
    }, [images])
  
    function setPictureClick(newIndex, newPicture){
      setPicture({index:newIndex, img: newPicture})
    }

    if (!currentPicture.img) {
      return null;
    }

    return (
    <div className="art-page__gallery">
        <div className="art-page__big-picture">
            <img
              src={imageUrlBuilder(
                currentPicture.img.formats?.large
                  ? currentPicture.img.formats.large.url
                  : currentPicture.img.formats?.medium
                    ? currentPicture.img.formats.medium.url
                    : currentPicture.img.formats?.small
                      ? currentPicture.img.formats.small.url
                      : currentPicture.img.formats?.thumbnail?.url || currentPicture.img.url
              )}
            />
        </div>
        <div className="art-page__thumbnails">
        {
            normalizedImages.map((picture, i) => 
                <div className={ `art-page__thumbnail ${ currentPicture.index === i ? 'art-page__thumbnail--active': null} `} 
                key={picture.id} style={{ backgroundImage: 'url(' + imageUrlBuilder( picture.formats?.small ?  picture.formats.small.url:  picture.formats?.thumbnail?.url || picture.url) + ')'}} onClick={ setPictureClick.bind(this, i, picture)}></div>  
            )
        }
        </div>
    </div>
    )
}