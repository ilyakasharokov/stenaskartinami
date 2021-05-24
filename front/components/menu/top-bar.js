import { useSession, signIn, signOut } from "next-auth/client";
import Link from "next/link";
import React from "react";
import { API_HOST } from "../../constants/constants";

export default function TopBar(){

    const [session, loading] = useSession()

    async function getUser(){
        const res = await fetch(API_HOST + '/users/me', {
            headers: {
              Authorization: `Bearer ${session.jwt}`,
            }
        });
        const json = await res.json()
    }
    
    if(session){
        getUser()
    }
    
    return (
        <div className="top-bar">
            <div className="top-bar__left"></div>
            {
                true &&
                <div className="top-bar__right">
                    <div className="top-bar__login">
                    {
                        !session &&
                        <Link href="/api/auth/signin">
                            <a className="top-bar__auth-link"
                                onClick={(e) => {
                                e.preventDefault();
                                signIn('facebook');
                                }}
                            >
                                Вход через Facebook
                            </a>
                        </Link>
                    }
                    {
                        session &&
                        <div className="top-bar__signed">
                            <span className="top-bar__user-name">{ session.user.name }</span>
                            | 
                            <Link href="/api/auth/signout">
                                <a className="top-bar__auth-link"
                                    onClick={(e) => {
                                    e.preventDefault();
                                    signOut();
                                    }}
                                >
                                    Выйти
                                </a>
                            </Link>
                        </div>
                    }
                    </div>
                </div>
            }
        </div>
    )
}