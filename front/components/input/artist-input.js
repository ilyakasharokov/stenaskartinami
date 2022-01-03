import { useState, useEffect } from "react"
import { API_HOST } from "@/constants/constants"
import { useSession } from "next-auth/client";
import Router from 'next/router';
const cache = {};

export default function ArtistInput({onArtistChange}){

    let [ options, setOptions] = useState([]);
    let [ value, setValue ] = useState("");
    

    function onChange(e){
        let newVal = e.target.value;
        if( newVal === value){
            return;
        }
        setValue(newVal);
        console.log(cache);
        let artist = { id: null, full_name: newVal};
        onArtistChange(artist);
        if(newVal.length > 2){
            if(!cache.hasOwnProperty(newVal)){
                fetch(API_HOST + `/artists?full_name_contains=${newVal}`)
                .then(response=>response.json())
                .then(json => {
                    console.log(json)
                    if(json && json.length){
                        let opts = json.map((j) => {
                            return {full_name: j.full_name, id: j.id }
                        })
                        cache[newVal] = opts.slice(0, 7)
                        setOptions(opts.slice(0, 7));
                    }else{
                        cache[newVal] = [];
                        setOptions([]);
                    }
                })
            }else{
                setOptions(cache[newVal]);
            }
        }else{
            setOptions([]);
        }
    }

    function setArtist(setArtist){
        let artist = { id: setArtist.id, full_name: setArtist.full_name };
        onArtistChange(artist);
        setValue(setArtist.full_name)
        setOptions([])
    }
    
    return (
        <div className="form-input">
            <label>Имя художника или псевдоним</label>
            <div className="form-input__options-wrapper">
                <input type="text" name="Artist" value={value} onChange={(e)=>onChange(e)} placeholder="Малевич" required/>
                {
                    options.length > 0 && <div className="form-input__options">
                    {
                        options.map((option) =>
                            <div className="form-input__option" onClick={()=>setArtist(option)} key={option.id}>{ option.full_name }</div>
                        )
                    }
                    </div>
                }
            </div>
        </div>
    )
}
