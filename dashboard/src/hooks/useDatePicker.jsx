import { useState } from "react";

const useDatePicker = (initialDate = null) => {
    const [startDate, setStartDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(null);

    const handleSelectToday = (type) => {
        if (type === "start") {
            setStartDate(new Date());
        } else {
            setEndDate(new Date());
        }
    };

    const handleClearDate = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const renderFooter = (type) => (
        <div className='datepicker-footer'>
            <button onClick={() => handleSelectToday(type)} className='button today-btn'>Today</button>
            <button onClick={() => handleClearDate(type)} className='button today-btn'>Clear</button>
        </div>
    );

    return { startDate, endDate, setStartDate, setEndDate, renderFooter };
};

export default useDatePicker