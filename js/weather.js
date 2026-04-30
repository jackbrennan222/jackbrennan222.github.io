async function initWeather() {
    // Houston coordinates
    const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=29.76&longitude=-95.36&daily=temperature_2m_max,temperature_2m_min&current=temperature_2m,weather_code,is_day&current_weather=true&timezone=America%2FChicago&forecast_days=1&temperature_unit=fahrenheit"
    );
    const data = await res.json();
    const w = data.current_weather;
    const d = data.daily;

    const temp = Math.round(w.temperature);
    const isDay = w.is_day;
    const high = d.temperature_2m_max; 
    const low = d.temperature_2m_min; 

    // WMO weather code → emoji + label
    function describeWeather(code, isDay) {
        if (code === 0)  return isDay ? ["☀", "Sunny"]        : ["🌙", "Clear"];
        if (code <= 2)   return ["⛅", "Partly Cloudy"];
        if (code === 3)  return ["☁", "Overcast"];
        if (code <= 48)  return ["🌫", "Foggy"];
        if (code <= 57)  return ["🌧", "Drizzle"];
        if (code <= 67)  return ["🌧", "Rain"];
        if (code <= 77)  return ["🌨", "Snow"];
        if (code <= 82)  return ["🌦", "Showers"];
        if (code <= 99)  return ["⛈", "Thunderstorm"];
        return ["🌡", "Unknown"];
    }

    function make_meta(h, l) {
        return `H: ${Math.round(h)}° · L: ${Math.round(l)}°`;
    }

    const [icon, label] = describeWeather(w.weathercode, isDay);

    document.querySelector(".weather .sun").textContent = icon;
    document.querySelector(".weather strong").textContent = `${temp}°F`;
    document.querySelector(".weather p").textContent = label;
    document.querySelector(".weather .mini-meta").textContent = make_meta(high, low);
}