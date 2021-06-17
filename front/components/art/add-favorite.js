import { useState, useEffect } from "react"
import { API_HOST } from "../../constants/constants"
import urlencodeFormData from "../../utils/urlencodeFormData"
import { useSession } from "next-auth/client";

export default function AddFavorite({art}){

    let userArts = [];

    const [session, loading] = useSession()
    let [ isActive, setActive] = useState(false);

    if(session && session.info && session.info.arts){
        if(session.info.arts.find((_art) => _art.id === art.id)){
            setActive(true);
        }else{
            setActive(false);
        }
    }

    function toggleFavorite(artId){
        if(session){
            let data = new FormData();
            data.append('artId', artId);
            fetch(API_HOST + '/users-permissions/users/me', {
                method: 'PUT',
		body: data,
                headers: {
                    Authorization: `Bearer ${session.jwt}`,
                }
            }).then(res => res.json()).then((json)=> {
                if(json.arts){
                    session.user = json;
                }
                setActive(!isActive);
            })
        }
    }


    return (
        <div title="Избранное" className={`favorite-btn ${ isActive ? 'active': ''}`} onClick={() => toggleFavorite(art)}></div>
    )
  }
