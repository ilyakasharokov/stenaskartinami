import { useSession, signIn, signOut } from "next-auth/client";
import { API_HOST } from "../../constants/constants";

export default function UserService(){

    let user = null;

    const [session, loading] = useSession()

    async function getUser(){
        const res = await fetch(API_HOST + '/users/me', {
            headers: {
              Authorization: `Bearer ${session.jwt}`,
            }
        });
        const json = await res.json()
        user = json;
    }
    
    if(session){
        getUser()
    } 

    return user;

}