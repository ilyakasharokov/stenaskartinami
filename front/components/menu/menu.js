import Link from 'next/link'

export default function Menu(){

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
     <div className="top-menu">
        {
          menuItems.map( (item, index) => 
            <div key={item.link} className="top-menu__item">
              <Link href={item.link}>{item.title}</Link>
            </div>
          )
        } 
      </div>
    
  )
}