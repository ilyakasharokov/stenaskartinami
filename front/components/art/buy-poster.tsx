import { useState } from "react"
import { API_HOST } from "@/constants/constants"
import urlencodeFormData from "@/utils/urlencodeFormData"
import InputMask from 'react-input-mask';

export default function BuyPoster({art}){

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
        <div className="art-page__buy-poster">
            {
                <form onSubmit={ (event)=> submitForm(event)}>
                    <div className={`art-page__buy-expand ${state.show ? 'active': ''}`}>
                    {
                        !state.sent &&
                        <div className="art-page__buy-text">
                            <p>Постер создается в натуральную величину оригинала.
                            Высококачественная цифровая печать на холсте или плотной бумаге.</p>

                            <p>Индивидуальное оформление под ваш интерьер, подпись художника.</p>

                            <p>Действует доставка по всему миру.
                            Помните, заказывая постер, вы напрямую поддерживаете автора.</p>

                            <p>Для заказа заполните форму обратной связи.</p>
                        </div>
                    }
                    {
                        !state.sent && 
                        <div>
                        <div className="form-input">
                            <input type="text" name="name" placeholder="Имя" required/>
                        </div>
                        <div className="form-input">
                            <input type="email" name="email" placeholder="E-mail" required/>
                        </div>
                        <div className="form-input">
                            <InputMask mask="+9-999-999-99-99" maskChar={null} maskplaceholder="+7-123-456-89-90" name="phone" type="tel" placeholder="Номер телефона" required/>
                        </div>
                        <input type="hidden" name="title" value="Заказать постер"></input>
                        <input type="hidden" name="text" value={art.Title + ', ' + art.Artist.full_name + ', id = ' + art.id }></input>
                        </div>
                    }
                    </div>
                    {
                    state.sent && 
                    <div className="art-page__sent">
                        Сообщение отправлено! Мы свяжемся с Вами с ближайшее время.
                    </div>
                    }
                    <div className={`art-page__buy-block-btns ${state.show ? 'closed': ''}`}>
                    {
                        !state.sent &&
                        <div className="art-page__price"></div>
                    }
                    {
                        state.show && !state.sent &&
                        <button className="btn buy-btn" type="submit">Заказать</button>
                    }
                    {
                        !state.show && !art.sold &&
                        <div className="btn buy-btn" onClick={ (event) => buyClick(event)}>Постер</div>
                    }
                    </div>
                </form>
            
        }
      </div>
    )
  }