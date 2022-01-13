import MainLayout from "@/components/layouts/MainLayout"
import { API_HOST } from "@/constants/constants"
import Head from 'next/head'
import { useState, useRef } from "react"
import ImageUploading from "react-images-uploading";
import urlencodeFormData from '../../utils/urlencodeFormData'
import ArtistInput from "@/components/input/artist-input";
import urlencodeFromObject from "@/utils/urlencodeFromObject";
import YearInput from "@/components/input/year-input";
import { useSession, signIn, signOut } from "next-auth/client";
import Preloader from "@/components/preloader/preloader"

export default function AddArt() {

  const [session, loading] = useSession();
  const [ images, setImages ] = useState([]);
  const [ artist, setArtist] = useState({ id: null, name: ''});
  const [ date, setDate] = useState(new Date());
  const [ errors, setErrors ] = useState({imageUploadError:false});
  const [ uploading, setUploading ] = useState(false);
  const [ loaded, setLoaded ] = useState(false);
  const form = null;


  function onImagesChange(imageList, addUpdateIndex){
    setImages(imageList);
    setErrors({imageUploadError:false})
  };

  async function postArtist(e, artist){
    let data = new FormData(e.target);
    let response = await fetch( API_HOST + '/artists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: urlencodeFromObject({full_name: artist.full_name, description: data.get("Artist_description"), })
    })
    return response.json()
  }
  
  async function submitForm(e){
    e.preventDefault();

    if(!session || session && !session.jwt){
      setUploading(false)
      return setLoaded({statusCode: 401})
    }

    setUploading(true);

    if(!artist.id){
      let uploadedArtist = await postArtist(e, artist);
      if(uploadedArtist && uploadedArtist.id){
        artist.id = uploadedArtist.id;
        setArtist({id:uploadedArtist.id, full_name: uploadedArtist.full_name})
      }
    }

    let data = new FormData();
    images.forEach(file => {
      data.append(
        'files', file.file, file.file.name)
    })
    let response = await fetch( API_HOST + '/upload', {
        method: 'POST',
        body: data
    })
    
    let imagesUploaded = await response.json()
    if(imagesUploaded[0] && imagesUploaded[0].id){
      data = new FormData(e.target);
      let art = {
        Title: data.get("Title"),
        Description: data.get("Description"),
        Articul: "",
        Artist: artist.id,
        Year: date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + (date.getDate())).slice(-2),
        Materials: data.get("Materials"),
        Owners_price: data.get("Owners_price"),
        width: data.get("width"),
        height: data.get("height"),
        user_uploader: session.info.id
      };

      art['Pictures[]'] = imagesUploaded.map((p)=>p._id);
      let urlEncodedData = urlencodeFromObject(art);
      response = await fetch( API_HOST + '/artsd', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.jwt}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: urlEncodedData
      });
      let json = await response.json();
      setUploading(false);
      setLoaded(
        json
      );
      console.log(json);
    }else{
      setUploading(false);
      setErrors({imageUploadError:true})
    }
  }

  function onArtistChange(newArtist){
    setArtist(newArtist);
  }

  function onDateChange(newDate){
    setDate(newDate);
  }

  function resetForm(){
    setLoaded(null);
    setImages([])
  }

  return (<MainLayout>
    <Head>
      <title>Где художнику выставить картину?| Стена с картинами, облачная галерея</title>
    </Head>
    <div className="form-page add-art-page">
      {
        uploading &&
        <div className="overlay">
          <Preloader text={'Загружаем картину . . . '}></Preloader>
        </div>
      }
      {
        !loaded && 
        <div>
        <h1>Добавить картину </h1>
        {`${session ? '': '(доступно только авторизованым пользователям!)'}`}<br></br><br></br>
        <div className="form-page__wrapper">
        <form onSubmit={ (event)=> submitForm(event)} >
          <div className="form-group-input">
            <div className="form-input">
              <label>Название работы</label>
              <input type="text" name="Title" placeholder="Черный квадрат" required/>
            </div>
            <YearInput onChange={onDateChange}></YearInput>
          </div>
          <div className="form-group-input">
            <ArtistInput onArtistChange={onArtistChange}></ArtistInput>
            <div className="form-input">
              <label>Размеры</label>
              <div className="form-input__group">
                <input type="number" name="width" placeholder="100 см" required/>
                <div className="form-input__spacer">x</div>
                <input type="number" name="height" placeholder="100 см" required/>
              </div>
            </div>
          </div>
          {
            artist && artist.full_name && artist.id === null &&
            <div className="form-input">
              <label>Об авторе</label>
              <textarea name="Artist_description" placeholder="Краткая биография, творческий путь, участие в выставках . . ." required></textarea>
            </div>
          }
          <h3>Загрузите изображения</h3>
          {
            false && <div>
            <p>Качественные фотографии при хорошем естественном дневном освещении <br></br>
            <i>(Фото с четким пониманием границ работы, чем качественнее фото, тем выше вероятность публикации на сайте).</i></p>
            <ul>
              <li> фото обратной стороны картины</li>
              <li> фото деталей ( текстура. подпись )</li>
              <li> фото работы в проекции ( для понимания толщины и качества холста )</li>
            </ul>
            <p>Фотографии должны быть высокого качества не меньше (1200 или 1600 пикселей)</p>
            </div>
          }
          <ImageUploading
            multiple
            value={images}
            onChange={onImagesChange}
            maxNumber={5}
            dataURLKey="data_url"
            imgExtension={['.jpg', '.png', '.jpeg']}
            maxFileSize={5242880}
          >
            {({
              imageList,
              onImageUpload,
              onImageRemove,
              isDragging,
              dragProps
            }) => (
              // write your building UI
              <div className={`upload__image-wrapper ${errors.imageUploadError ? 'error':''}`} >
                <div type="button" className="upload__image-btn"
                  style={isDragging ? null : null}
                  onClick={onImageUpload}
                  {...dragProps}
                >
                  <img className="upload__logo" src="/images/square_logo.png"></img>
                  <strong>Для загрузки кликните или перетащите сюда изображение</strong>
                  <span>( .jpg, .png, максимальный размер 3 мб )</span>

                  {
                    imageList.length > 0 && <div className="upload__images-list">
                    {
                      imageList.map((image, index) => (
                      <div key={index} className="image-item">
                        <img src={image.data_url} alt="" width="100" />
                        <div className="image-item__btn-wrapper">
                          <button onClick={(e) => { e.stopPropagation();onImageRemove(index) }} type="button">X</button>
                        </div>
                      </div>
                      ))
                    }
                    </div>
                  }

                </div>
                
              </div>
            )}
          </ImageUploading>
          <div className="form-input">
            <label>Описание, история, любые мысли</label>
            <textarea name="Description" placeholder="«Чёрный квадрат» входит в цикл супрематических работ Казимира Малевича, в которых художник исследовал базовые возможности цвета и композиции; является, по замыслу, частью триптиха, в составе которого также присутствуют «Чёрный круг» и «Чёрный крест»." required></textarea>
          </div>
          <div className="form-group-input">
            <div className="form-input">
              <label>Материалы</label>
              <input type="text" name="Materials" placeholder="Холст, масло" required/>
            </div>
            <div className="form-input">
              <label>Желаемая цена</label>
              <input type="text" name="Owners_price" placeholder="10000 р" required/>
            </div>
          </div>
          <div className="align-right">
            <button className="btn" type="submit">Отправить на модерацию</button>
          </div>
        </form>
        </div>
        </div>
      }
      
      {
        loaded && loaded.Title &&
        <div className="form-page__sent">
          Спасибо! Работа "{ loaded.Title }" художника { loaded.Artist.full_name } добавлена в очередь на модерацию, скоро она появится на сайте! 
          <button className="btn" type="button" onClick={()=>resetForm()}>Добавить еще одну</button>
        </div>
      }
      {
        loaded && !loaded.Title && loaded.statusCode !== 401 &&
        <div className="form-page__sent">
          Упс, произошла непредвиденная ошибка :(
          <button className="btn" type="button" onClick={()=>resetForm()}>Попробовать заново</button>
        </div>
      }
            {
        loaded && loaded.statusCode == 401 &&
        <div className="form-page__sent">
          Вы не авторизованы! :( <br></br>Войдите с помощью соц сетей и повторите попытку.
          <button className="btn" type="button" onClick={()=>resetForm()}>Попробовать заново</button>
        </div>
      }
      </div>
  </MainLayout>
  )
}