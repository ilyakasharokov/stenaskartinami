import { useState } from "react"
import { API_HOST } from "../../constants/constants"
import urlencodeFormData from "../../utils/urlencodeFormData"
import { useSession, signIn, signOut } from "next-auth/client";

export default function AddFavorite({artId}){

    const [session, loading] = useSession()
    let [ isActive, setActive] = useState(false);

    async function getUser(){
        const res = await fetch(API_HOST + '/users/me', {
            headers: {
              Authorization: `Bearer ${session.jwt}`,
            }
        });
        const json = await res.json()
        if(json.arts && json.arts.find((art) => art.id == artId)){
            setActive(true)
        }
    }
    
    if(session){
        getUser()
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
                console.log(json);
                setActive(!isActive);
            })
        }
    }


    return (
        <div className={`favorite-btn ${ isActive ? 'active': ''}`} onClick={() => toggleFavorite(artId)}></div>
    )
  }
