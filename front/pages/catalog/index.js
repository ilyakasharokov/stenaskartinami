import MainLayout from "../../components/layouts/MainLayout"
import { useState, useEffect } from "react"


export default function Catalog({ Component, pageProps }) {
  
  const API_HOST = 'http://18.157.84.41:1337'

  const [arts, setArts] = useState([])

  useEffect(()=> {
    function load(){
      fetch(API_HOST + '/arts')
      .then(
      (answer) => answer.json()
      )
      .then((json) => {
        setArts(json)
        console.log(json)
      })
    }

    load()
  } 
    ,[]
  )

  const resizeThrottled = throttle(resizeAllGridItems, 100)

  function throttle(func, ms) {

    let isThrottled = false,
      savedArgs,
      savedThis;
  
    function wrapper() {
  
      if (isThrottled) { // (2)
        savedArgs = arguments;
        savedThis = this;
        return;
      }
  
      func.apply(this, arguments); // (1)
  
      isThrottled = true;
  
      setTimeout(function() {
        isThrottled = false; // (3)
        if (savedArgs) {
          wrapper.apply(savedThis, savedArgs);
          savedArgs = savedThis = null;
        }
      }, ms);
    }
  
    return wrapper;
  }

  function resizeGridItem(item){
    let grid = document.getElementsByClassName("catalog-grid")[0];
    let rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
    let rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));
    let rowSpan = Math.ceil((item.querySelector('.catalog-item__wrapper').getBoundingClientRect().height+rowGap)/(rowHeight+rowGap));
    item.style.gridRowEnd = "span "+rowSpan;
  }

  function resizeAllGridItems(){
    let allItems = document.getElementsByClassName("catalog-item");
    for(let x=0;x<allItems.length;x++){
       resizeGridItem(allItems[x]);
    }
  }

  return (<MainLayout>
    <h1>Каталог</h1>
    <div className="catalog">
      <div className="catalog-filters"></div>
      <div className="catalog-grid">
      {
        arts.map((art) =>
          <div className="catalog-item" key={art.id}>
            <div className="catalog-item__wrapper">
              <div className="catalog-item__img-wrap">
                <img className="catalog-item__img" src={API_HOST + art.Pictures[0].url} alt={art.Title} onLoad={resizeThrottled}/>
              </div>
              <div className="catalog-item__title">{art.Title}</div>
              <div className="catalog-item__size">{art.Size.Width} x {art.Size.Height}</div>
              { 
                art.Artist &&
                <div className="catalog-item__artist">{art.Artist.full_name} 
                  {
                    art.Year && 
                    <span>, { (new Date(art.Year)).getFullYear()}</span>
                  }
                </div>
              }
            </div>
          </div>
        )
      }
      </div>
    </div>
  </MainLayout>
  )
}