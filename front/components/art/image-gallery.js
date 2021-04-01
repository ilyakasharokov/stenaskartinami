import { useEffect, useState } from 'react'
import imageUrlBuilder from '../../utils/img-url-builder'

export default function ImageGallery({images}){

    const [currentPicture, setPicture] = useState({index: 0, img: images[0]})
  
    useEffect(()=>{
      setPicture({index: 0, img: images[0]})
    }, [images])
  
    function setPictureClick(newIndex, newPicture){
      setPicture({index:newIndex, img: newPicture})
    }

    return (
    <div className="art-page__gallery">
        <div className="art-page__big-picture">
            <img src={ imageUrlBuilder( currentPicture.img.formats.large ? currentPicture.img.formats.large.url: (currentPicture.img.formats.medium ? currentPicture.img.formats.medium.url: currentPicture.img.formats.small ?  currentPicture.img.formats.small.url:  currentPicture.img.formats.thumbnail.url)) }/>
        </div>
        <div className="art-page__thumbnails">
        {
            images.map((picture, i) => 
                <div className={ `art-page__thumbnail ${ currentPicture.index === i ? 'art-page__thumbnail--active': null} `} 
                key={picture.id} style={{ backgroundImage: 'url(' + imageUrlBuilder( picture.formats.small ?  picture.formats.small.url:  picture.formats.thumbnail.url) + ')'}} onClick={ setPictureClick.bind(this, i, picture)}></div>  
            )
        }
        </div>
    </div>
    )
}