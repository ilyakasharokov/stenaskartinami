import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import React from "react";
import dynamic from 'next/dynamic';

const SearchWidget = dynamic(() => import('../menu/search'), { ssr: false });

export default function TopBar(){

    const { data: session, status } = useSession()
    const loading = status === 'loading'

    return (
        <div className="top-bar">
            <div className="top-bar__left">
                <SearchWidget></SearchWidget>
            </div>
            {
                true &&
                <div className="top-bar__right">
                    <div className="top-bar__login">
                    {
                        !session &&
                        <Link href="/auth/signin" className="top-bar__auth-link">
                            Войти
                        </Link>
                    }
                    {
                        session && 
                        <div className="top-bar__signed">
                            {
                                session.info && session.info.arts &&
                                <Link href="/account/favorite" title="Избранное" className={`favorite-btn ${ session.info.arts.length > 0 ? 'active': ''}`}></Link>
                            }
                            {
                                session.info && 
                                <Link href="/account/my-arts" className="top-bar__user-name">{ session.user.name }</Link>
                            }
                            | 
                            <Link href="/api/auth/signout" className="top-bar__auth-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    signOut();
                                }}
                            >
                                Выйти
                            </Link>
                        </div>
                    }
                    </div>
                </div>
            }
        </div>
    )
}