import MainLayout from "../components/layouts/MainLayout"
import { API_HOST } from "../constants/constants"
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
      <title>Аренда картин бесплатно? | Стена с картинами, облачная галерея</title>
    </Head>
    <div className="form-page">
      <h1>Добавить картину</h1>
      <div class="form-page__wrapper">
        <div class="form-page__left">
          <img className="form-page__image" src={ API_HOST + '/uploads/photo_2021_03_22_17_26_34_1769d88fce.jpeg?14694382.854999974'}></img>
        </div>
        <div className="form-page__right">
          <p>Общественные пространства, ВАМ!</p>
          <p>Облачная галерея "Стена с картинами" открыта к сотрудничеству.
          Если вы или ваши знакомые,  являетесь владельцами, управляющими  площадок, т.к </p>
          <ul>
            <li>отели, </li>
            <li>кофейни, </li>
            <li>книжные магазины, </li>
            <li>коворкинг, </li>
            <li>офисы и др. </li>
          </ul>
          <p>
          Хотите расширить аудиторию,взрастить культурную среду в однообразии пустых стен?
          Мы готовы на идейной основе, предоставить индивидуальную подборку работ.</p>
          <p>В нашем собрании более ста различных художников, несколько   постоянно функционирующих экспозиций.</p>
          {
            !state.sent && 
            <form onSubmit={ (event)=> submitForm(event)}>
              <div class="form-input">
                <input type="text" name="name" placeholder="Имя" required/>
              </div>
              <div class="form-input">
                <input type="email" name="email" placeholder="E-mail" required/>
              </div>
              <div class="form-input">
                <textarea name="text" placeholder="Сообщение"></textarea>
              </div>
              <div className="align-right">
                <button className="btn" type="submit">Отправить</button>
              </div>
              <input type="hidden" name="title" value="Добавить стену"></input>
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