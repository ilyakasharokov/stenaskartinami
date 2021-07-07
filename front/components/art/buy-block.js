import { useState } from "react"
import { API_HOST } from "@/constants/constants"
import urlencodeFormData from "@/utils/urlencodeFormData"

export default function BuyBlock({art}){

    const [state, setPageState] = useState({sent: false, show: false})

    function buyClick(event){
        setPageState({sent: false, show: true})
    }

    async function submitForm(e){
        e.preventDefault();
        let response = await fetch(API_HOST  + '/forms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: urlencodeFormData(new FormData(e.target))
        });
    
        let result = await response.json();
    
        setPageState({sent: true, show: true})
      }

    return (
        <div className="art-page__buy-block">
        <form onSubmit={ (event)=> submitForm(event)}>
            <div className={`art-page__buy-expand ${state.show ? 'active': ''}`}>
            {
                !state.sent &&
                <div className="art-page__buy-text">
                    Все работы поставляются в качественной упаковке, надежной транспортной компанией в любую точку мира. Для получения консультации заполните форму обратной связи, наши консультанты свяжутся с вами
                </div>
            }
            {
                !state.sent && !art.sold &&
                <div>
                <div className="form-input">
                    <input type="text" name="name" placeholder="Имя" required/>
                </div>
                <div className="form-input">
                    <input type="email" name="email" placeholder="E-mail" required/>
                </div>
                <input type="hidden" name="title" value="Купить картину"></input>
                <input type="hidden" name="text" value={art.Title + ', ' + art.Artist.full_name + ', id = ' + art.id }></input>
                </div>
            }
            </div>
            {
            state.sent && 
            <div className="art-page__sent">
                Спасибо за интерес!
            </div>
            }
            <div className={`art-page__buy-block-btns ${state.show ? 'closed': ''}`}>
            {
                !state.sent &&
                <div className="art-page__price">{ art.sold ? 'ПРОДАНО' : art.Price ? art.Price  + ' P' : ''} </div>
            }
            {
                state.show && !state.sent &&
                <button className="btn buy-btn" type="submit">Отправить</button>
            }
            {
                !state.show && !art.sold &&
                <div className="btn buy-btn" onClick={ (event) => buyClick(event)}>Купить</div>
            }
            </div>
        </form>
      </div>
    )
  }