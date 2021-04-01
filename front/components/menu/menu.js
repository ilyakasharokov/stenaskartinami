import Link from 'next/link'
import { useState } from 'react';

export default function Menu(){

  const [showMenu, setShowMenu] = useState(false)

  function toggleMenu(){
    setShowMenu(!showMenu)
  }

  const menuItems = [
    {
      title: 'О проекте',
      link: '/about'
    },
    {
      title: 'Главная',
      link: '/'
    },
    {
      title: 'Каталог',
      link: '/catalog'
    }, 
    {
      title: 'Добавить картину',
      link: '/add-art'
    },    
    {
      title: 'Добавить стену',
      link: '/add-wall'
    },
  ];

  return (
    <div>
      <div className="menu-btn" onClick={ () => toggleMenu() }></div>
      <div className={`top-menu ${showMenu ? 'active':''}`}>
        {
          menuItems.map( (item, index) => 
            <div key={item.link} className="top-menu__item" >
              <Link href={item.link} onClick={ () => setShowMenu(false) }>{item.title}</Link>
            </div>
          )
        } 
      </div>
    </div>
  )
}