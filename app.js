// Paste your OpenWeatherMap key here (see note: keys in frontend code are visible to anyone)
const API_KEY = "YOUR_API_KEY";
const DEFAULT_CITY = "Bengaluru";

const searchElement = document.getElementById("searchbar");
const searchForm = document.querySelector(".search");
const statusElement = document.getElementById("status");
const panel = document.getElementById("weatherPanel");

// Replaces the old hand-written country table (and fixes UK/GB)
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

const skyFor = (icon) => {
  const night = icon.endsWith("n");
  const code = icon.slice(0, 2);
  if (code === "01") return night ? "clear-night" : "clear-day";
  if (["02", "03", "04"].includes(code)) return "clouds";
  if (["09", "10"].includes(code)) return "rain";
  if (code === "11") return "storm";
  if (code === "13") return "snow";
  return "mist";
};

const setStatus = (message) => {
  statusElement.hidden = !message;
  statusElement.innerText = message || "";
};

const fetchWeather = async (query) => {
  setStatus("Loading…");
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&appid=${API_KEY}`
    );
    const result = await res.json();

    if (!res.ok) {
      setStatus(
        res.status === 404
          ? `No city found for "${query}". Check the spelling and try again.`
          : "Couldn't load weather. Check your API key and connection."
      );
      return;
    }

    const w = result.weather[0];
    document.getElementById("cityElement").innerText = result.name;
    document.getElementById("countryElement").innerText =
      countryNames.of(result.sys.country) || result.sys.country;
    document.getElementById("tempElement").innerText = Math.round(result.main.temp) + "°";
    document.getElementById("descElement").innerText = w.description;
    document.getElementById("feelsElement").innerText =
      "Feels like " + Math.round(result.main.feels_like) + "°";
    document.getElementById("weathericon").src =
      `https://openweathermap.org/img/wn/${w.icon}@2x.png`;
    document.getElementById("humidity").innerText = result.main.humidity + "%";
    document.getElementById("wind").innerText = Math.round(result.wind.speed * 3.6) + " km/h"; // API gives m/s
    document.getElementById("pressure").innerText = result.main.pressure + " hPa";

    document.body.dataset.sky = skyFor(w.icon);

    panel.classList.remove("loaded");
    void panel.offsetWidth; // restart the animation
    panel.classList.add("loaded");
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Network error. Please try again.");
  }
};

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchElement.value.trim();
  if (query) fetchWeather(query);
});

fetchWeather(DEFAULT_CITY);