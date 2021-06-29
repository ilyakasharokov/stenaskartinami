import { useState, useEffect } from "react"
import { API_HOST } from "../../constants/constants"
import urlencodeFormData from "../../utils/urlencodeFormData"
import { useSession } from "next-auth/client";
import Router from 'next/router';

export default function AddFavorite({art}){

    let userArts = [];

    const [session, loading] = useSession()
    let [ isActive, setActive] = useState(false);

    useEffect(()=>{
        if(session && session.info && session.info.arts){
            if(session.info.arts.find((_art) => _art.id === art.id)){
                setActive(true);
            }else{
                setActive(false);
            }
        }
    }, [session, art.id])

    function toggleFavorite(art){
        if(session){
            let data = new FormData();
            data.append('artId', art.id);
            fetch(API_HOST + '/users-permissions/users/me', {
                method: 'PUT',
		body: data,
                headers: {
                    Authorization: `Bearer ${session.jwt}`,
                }
            }).then(res => res.json()).then((json)=> {
                if(json.arts){
                    session.info = json;
                }
                setActive(!isActive);
            })
        }else{
            Router.push('/auth/signin')
        }
    }


    return (
        <div title="Избранное" className={`favorite-btn ${ isActive ? 'active': ''}`} onClick={() => toggleFavorite(art)}></div>
    )
  }
