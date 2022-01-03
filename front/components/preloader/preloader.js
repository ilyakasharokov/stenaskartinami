export default function Preloader({text}){

  return (
    <div className="lds-circle2 preloader">{text && text.length > 0 ? <span>{text}</span>: ''}<div></div></div>
  )
}