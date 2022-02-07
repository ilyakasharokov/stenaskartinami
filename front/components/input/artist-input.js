import { useState, useEffect } from "react"
import { API_HOST } from "@/constants/constants"
import Preloader from "../preloader/preloader";
// const cache = {};

export default function ArtistInput({onArtistChange}){

    let [ options, setOptions] = useState([]);
    let [ value, setValue ] = useState("");
    let [ loading, setLoading ] = useState(false);
    let timerId = null;
    let [ newArtist, setNewArtist ] = useState({id:null, full_name: ""});
    let [ focus, setFocus ] = useState(false);
    
    function  debounceFunction(func, delay) {
        // Cancels the setTimeout method execution
        clearTimeout(timerId)
    
        // Executes the func after delay time.
        timerId  =  setTimeout(func, delay)
    }

    function loadArtists(newVal){
        fetch(API_HOST + `/artists?full_name_contains=${newVal}`)
        .then(response=>response.json())
        .then(json => {
            // console.log(json)
            if(json && json.length){
                let opts = json.map((j) => {
                    return {full_name: j.full_name, id: j.id }
                })
                // cache[newVal] = opts.slice(0, 7);
                if(focus) {
                    let found = opts.find((opt)=> opt.full_name.toLowerCase() === newVal.toLowerCase());
                    if(found){
                        setNewArtist(found);
                    }
                    setOptions(opts.slice(0, 7));
                }else{
                    setOptions([])
                }
            }else{
                // cache[newVal] = [];
                setOptions([]);
            }
            setLoading(false);
        })
        .catch(error => {
            setLoading(false)
            setOptions([])
            console.error(error)
        })
    }

    function onChange(e){
        let newVal = e.target.value;
        // console.log(newVal, value)
        if( newVal === value){
            return;
        }
        setValue(newVal);
        // console.log(cache);
        let artist = { id: null, full_name: newVal};
        setNewArtist(artist);
        onArtistChange(artist);
        if(newVal.length > 1){
            //if(!cache.hasOwnProperty(newVal)){
                setLoading(true);
                debounceFunction(()=>loadArtists(newVal), 500)
            //}else{
            //    setOptions(cache[newVal]);
            // }
        }else{
            setOptions([]);
        }
    }

    function clickArtist(clickedArtist){
        clearTimeout(timerId)
        let artist = { id: clickedArtist.id, full_name: clickedArtist.full_name };
        setNewArtist(artist);
        onArtistChange(artist);
        setValue(clickedArtist.full_name)
        setOptions([])
    }

    function hideOptions(){
        clearTimeout(timerId);
        setOptions([]);
    }

    function onFocus(){
        setFocus(true);
    }

    function onBlur(){
        setTimeout(()=>setFocus(false), 300)
    }
    
    return (
        <div className="form-input">
            <label>Имя художника или псевдоним</label>
            <div className="form-input__options-wrapper">
                <input type="text" name="Artist" value={value} onChange={(e)=>onChange(e)} onFocus={()=>onFocus()} onBlur={()=>onBlur()} placeholder="Малевич" required/>
                {
                    focus && options.length > 0 && <div className="form-input__options">
                    {
                        options.map((option) =>
                            <div className="form-input__option" onClick={()=>clickArtist(option)} key={option.id}>{ option.full_name }</div>
                        )
                    }
                    </div>
                }
                <div className="form-input__hint">
                {
                    loading && 
                    <div className="loading-icon"></div>
                }
                {
                    newArtist.id !== null &&
                    <div className="form-input__message">есть на сайте <div className="ok"></div></div> 
                }
                </div>
            </div>
        </div>
    )
}
