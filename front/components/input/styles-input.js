import { useState, useEffect } from "react"
import { API_HOST } from "@/constants/constants"
import Preloader from "../preloader/preloader";
// const cache = {};

export default function StylesInput({onStylesChange}){

    let [ options, setOptions] = useState([]);
    let [ newStyle, setNewStyle ] = useState({id:null, full_name: ""});

    useEffect(()=>{
        fetch(API_HOST + `/styles`).then(response=>response.json())
        .then(json => {
            setOptions(json.sort((a,b) => a.Title < b.Title ? -1: 1 ))
        })
    }, [])

    function clickStyle(style){
        style.active = !style.active
        let newOptions = Object.assign([], options)
        setOptions(newOptions)
        onStylesChange(newOptions.filter((o)=>o.active).map((o)=>o.id))
    }


    return (
        <div className="form-input">
            <label>Стиль</label>
            <div className="form-input__hints-wrapper">
                {
                    options.length > 0 && <div className="form-input__hints">
                    {
                        options.map((option) =>
                            <div className={`form-input__suggestion ${option.active ? 'active': ''}`} onClick={()=>clickStyle(option)} key={option.id}>{ option.Title }</div>
                        )
                    }
                    </div>
                }
            </div>
        </div>
    )
}
