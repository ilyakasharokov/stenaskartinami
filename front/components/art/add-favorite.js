import { useState, useEffect } from "react"
import { API_HOST } from "@/constants/constants"
import { useSession } from "next-auth/react";
import Router from 'next/router';

export default function AddFavorite({art}){

    let userArts = [];

    const { data: session, status } = useSession()
    const loading = status === 'loading'
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
            fetch(API_HOST + '/users/me', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${session.jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ artId: art.id }),
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
