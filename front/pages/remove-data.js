import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import urlencodeFormData from '../utils/urlencodeFormData'
import { useState } from "react"

export default function AddArt({ Component, pageProps }) {

  const [ state, setPageState ] = useState({sent: false})
  
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

    setPageState({sent: true})
  }

  return (<MainLayout>
    <Head>
      <title>Запрос на удаление данных| Стена с картинами, облачная галерея</title>
    </Head>
    <div className="form-page">
      <h1>Запрос на удаление данных</h1>
      <div className="form-page__wrapper">
        <div className="form-page__left">
          <img className="form-page__image" src='/images/addart.jpeg'></img>
        </div>
        <div className="form-page__right">
          <p>Для запроса об удалении данных, пожалуйста, заполните данную форму и отправьте сообщение. Мы удалим Ваши данные и оповестим Вас об этом.</p>
          {
            !state.sent && 
            <form onSubmit={ (event)=> submitForm(event)}>
              <div className="form-input">
                <input type="text" name="name" placeholder="Имя" required/>
              </div>
              <div className="form-input">
                <input type="email" name="email" placeholder="E-mail" required/>
              </div>
              <div className="align-right">
                <button className="btn" type="submit">Отправить</button>
              </div>
              <input type="hidden" name="title" value="Запрос на удаление данных"></input>
            </form>
          }
          {
            state.sent && 
            <div className="form-page__sent">
              Спасибо, ваше сообщение отправлено, мы скоро с вами свяжемся! 
            </div>
          }
        </div>
      </div>
    </div>
  </MainLayout>
  )
}