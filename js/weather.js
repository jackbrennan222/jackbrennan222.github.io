async function initWeather() {
    // Houston coordinates
    const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=29.76&longitude=-95.36&current_weather=true&temperature_unit=fahrenheit"
    );
    const data = await res.json();
    const w = data.current_weather;

    const temp = Math.round(w.temperature);
    const isDay = w.is_day;

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

    const [icon, label] = describeWeather(w.weathercode, isDay);

    document.querySelector(".weather .sun").textContent = icon;
    document.querySelector(".weather strong").textContent = `${temp}°F`;
    document.querySelector(".weather p").textContent = label;
}