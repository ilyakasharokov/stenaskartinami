import { useSession, signIn, signOut } from "next-auth/client";
import Link from "next/link";
import React from "react";
import SearchWidget from '../menu/search';

export default function TopBar(){

    const [session, loading] = useSession()

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
                        <Link href="/auth/signin">
                            <a className="top-bar__auth-link"
                            >
                                Войти
                            </a>
                        </Link>
                    }
                    {
                        session && 
                        <div className="top-bar__signed">
                            {
                                session.info && session.info.arts &&
                                <Link href="/account/favorite">
                                    <a title="Избранное" className={`favorite-btn ${ session.info.arts.length > 0 ? 'active': ''}`}></a>
                                </Link>
                            }
                            {
                                session.info && 
                                <Link href="/account/my-arts">
                                    <a className="top-bar__user-name">{ session.user.name }</a>
                                </Link>
                            }
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