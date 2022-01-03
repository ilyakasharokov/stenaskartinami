import { useState, useEffect } from "react"
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from  "react-datepicker";
import ru from 'date-fns/locale/ru';
registerLocale('ru', ru)

import "react-datepicker/dist/react-datepicker.css";

export default function YearInput({onChange}){

    const [startDate, setStartDate] = useState(new Date());

    function onDateChange(date){
        setStartDate(date);
        onChange(date);
    }
    
    return (
        <div className="form-input">
            <label>Дата создания</label>
            <div className="form-input__options-wrapper">
                <DatePicker dateFormat="dd.MM.yyyy" showYearDropdown required locale="ru" selected={startDate} onChange={(date) => onDateChange(date)} />
            </div>
        </div>
    )
}
