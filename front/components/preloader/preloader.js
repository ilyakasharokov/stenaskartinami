export default function Preloader({text, children}){

  return (
    <div className="lds-circle2 preloader">
      <div className="preloader__children">{children}</div>
      <div className="preloader__circle"></div>
    </div>
  )
}