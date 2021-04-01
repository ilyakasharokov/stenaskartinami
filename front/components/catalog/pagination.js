const { useState, useEffect } = require("react")
import { CATALOG_ITEMS_PER_PAGE } from '../../constants/constants'

export default function Pagination({currentPage, count, setPage}){

    const [pagination, setPagination] = useState(count ? [...Array(Math.ceil(count / CATALOG_ITEMS_PER_PAGE))]: [])

    useEffect(()=>{
        setPagination(count ? [...Array(Math.ceil(count / CATALOG_ITEMS_PER_PAGE))]: [])
    }, [count])

    return (
        <div className="catalog__pagination pagination">
            {
                currentPage > 1 &&
                <svg class="pagination__arrow" xmlns="http://www.w3.org/2000/svg" width="11" height="28" viewBox="0 0 11 28" onClick={ ()=> setPage( currentPage - 1)}><title>angle-left</title><path d="M9.797 8.5a.54.54 0 0 1-.156.359L3.5 15l6.141 6.141c.094.094.156.234.156.359s-.063.266-.156.359l-.781.781c-.094.094-.234.156-.359.156s-.266-.063-.359-.156L.861 15.359C.767 15.265.705 15.125.705 15s.063-.266.156-.359L8.142 7.36c.094-.094.234-.156.359-.156s.266.063.359.156l.781.781a.508.508 0 0 1 .156.359z" fill="#666" stroke="#666"></path></svg>
                }
            {
                pagination.map((num, i) => 
                    <div className={`pagination__item ${ (currentPage === i + 1 ? 'pagination__item-active': '')}`} key={i} onClick={ ()=> setPage(i + 1)}>{i + 1}</div>  
                )
            }
            {
                currentPage < pagination.length && 
                <svg class="pagination__arrow" xmlns="http://www.w3.org/2000/svg" width="9" height="28" viewBox="0 0 9 28" onClick={ ()=> setPage( currentPage + 1)}><title>angle-right</title><path d="M9.297 15a.54.54 0 0 1-.156.359L1.86 22.64c-.094.094-.234.156-.359.156s-.266-.063-.359-.156l-.781-.781a.508.508 0 0 1-.156-.359.54.54 0 0 1 .156-.359L6.502 15 .361 8.859C.267 8.765.205 8.625.205 8.5s.063-.266.156-.359l.781-.781c.094-.094.234-.156.359-.156s.266.063.359.156l7.281 7.281a.536.536 0 0 1 .156.359z" fill="#666" stroke="#666"></path></svg>
                }
        </div>
    )
}