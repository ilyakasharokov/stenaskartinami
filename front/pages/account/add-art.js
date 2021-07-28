import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import urlencodeFormData from '@/utils/urlencodeFormData'
import { useState } from "react"
import ImageUploading from "react-images-uploading";

export default function AddArt({ Component, pageProps }) {

  const [ state, setPageState ] = useState({sent: false})
  const [ images, setImages ] = useState([]);

  function onChange(imageList, addUpdateIndex){
    // data for submit
    console.log(imageList, addUpdateIndex);
    setImages(imageList);
  };
  
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
      <title>Где художнику выставить картину?| Стена с картинами, облачная галерея</title>
    </Head>
    <div className="form-page">
      <h1>Добавить картину</h1>
      <div className="form-page__wrapper">
        <div className="form-page__right">
          {
            !state.sent && 
            <form onSubmit={ (event)=> submitForm(event)}>
              <div className="form-input">
                <input type="text" name="title" placeholder="Название работы" required/>
              </div>
              <ImageUploading
                multiple
                value={images}
                onChange={onChange}
                maxNumber={5}
                dataURLKey="data_url"
              >
                {({
                  imageList,
                  onImageUpload,
                  onImageRemoveAll,
                  onImageUpdate,
                  onImageRemove,
                  isDragging,
                  dragProps
                }) => (
                  // write your building UI
                  <div className="upload__image-wrapper">
                    <button
                      style={isDragging ? { color: "red" } : null}
                      onClick={onImageUpload}
                      {...dragProps}
                    >
                      Click or Drop here
                    </button>
                    &nbsp;
                    <button onClick={onImageRemoveAll}>Remove all images</button>
                    {imageList.map((image, index) => (
                      <div key={index} className="image-item">
                        <img src={image.data_url} alt="" width="100" />
                        <div className="image-item__btn-wrapper">
                          <button onClick={() => onImageUpdate(index)}>Update</button>
                          <button onClick={() => onImageRemove(index)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ImageUploading>
              <div className="form-input">
                <textarea name="description" placeholder="Сообщение"></textarea>
              </div>
              <div className="align-right">
                <button className="btn" type="submit">Отправить</button>
              </div>
              <input type="hidden" name="title" value="Добавить картину"></input>
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