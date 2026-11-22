// Paste your OpenWeatherMap key here
const API_KEY = "7570ca40b046a23d9acd58db170c9bc4";
const DEFAULT_CITY = "Bengaluru";

const $ = (id) => document.getElementById(id);
const searchInput = $("searchbar");
const form = $("searchForm");
const list = $("suggestions");
const statusEl = $("status");
const panel = $("weatherPanel");
const backImg = $("backimg");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const AQI = ["Good", "Fair", "Moderate", "Poor", "Very poor"];

backImg.addEventListener("load", () => backImg.classList.add("ready"));
backImg.addEventListener("error", () => backImg.classList.remove("ready"));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const setStatus = (m) => { statusEl.hidden = !m; statusEl.textContent = m || ""; };

async function get(path, params) {
  const qs = new URLSearchParams({ ...params, appid: API_KEY });
  const res = await fetch(`https://api.openweathermap.org${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || "Request failed"), { status: res.status });
  return data;
}
const errText = (e) =>
  e.status === 401 ? "API key rejected (401). Check the key; new keys can take a while to activate."
  : e.status === 429 ? "Too many requests. Wait a minute and try again."
  : e instanceof TypeError ? "Network error. Check your connection."
  : `Couldn't load weather: ${e.message}`;
const geocode = (q, limit = 5) => get("/geo/1.0/direct", { q, limit });

/* ---------- time helpers (city-local time via the API's UTC offset) ---------- */
const shifted = (u, tz) => new Date((u + tz) * 1000);
const fmtTime = (u, tz, o = { hour: "numeric", minute: "2-digit" }) =>
  shifted(u, tz).toLocaleTimeString("en", { timeZone: "UTC", ...o });
const fmtDay = (u, tz, o) => shifted(u, tz).toLocaleDateString("en", { timeZone: "UTC", ...o });
const windDir = (d) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];

/* ---------- animated SVG icons ---------- */
const rays = [...Array(8)].map((_, i) => `<line x1="32" y1="8" x2="32" y2="15" transform="rotate(${i * 45} 32 32)"/>`).join("");
const sun = (t = "") => `<g ${t}><g class="spin"><g stroke="#ffc94d" stroke-width="3" stroke-linecap="round">${rays}</g></g><circle cx="32" cy="32" r="11" fill="#ffd45e"/></g>`;
const moon = (t = "") => `<g ${t}><path class="bob" fill="#f6f1c7" d="M40 12a20 20 0 1 0 13 33A16 16 0 0 1 40 12z"/><circle class="twinkle" cx="50" cy="16" r="1.8" fill="#fff"/><circle class="twinkle" cx="55" cy="27" r="1.3" fill="#fff" style="animation-delay:.8s"/></g>`;
const cloud = (fill = "#f2f6fb", t = "") => `<path ${t} fill="${fill}" d="M18 46a8 8 0 0 1 1.5-15.9 12 12 0 0 1 23-2.6A9.5 9.5 0 0 1 46 46z"/>`;
const drops = (n, cls, color, w = 3) => `<g stroke="${color}" fill="${color}" stroke-width="${w}" stroke-linecap="round">${[24, 32, 40].map((x, i) => n === "line"
  ? `<line class="${cls}" style="animation-delay:${i * 0.33}s" x1="${x}" y1="50" x2="${x - 2}" y2="55"/>`
  : `<circle class="${cls}" style="animation-delay:${i * 0.7}s" cx="${x}" cy="53" r="2"/>`).join("")}</g>`;
const ICONS = {
  "clear-day": sun(),
  "clear-night": moon(),
  "partly-day": sun('transform="translate(-8 -10) scale(.8)"') + `<g class="drift">${cloud("#f2f6fb", 'transform="translate(6 6)"')}</g>`,
  "partly-night": moon('transform="translate(-6 -6) scale(.8)"') + `<g class="drift">${cloud("#e4eaf3", 'transform="translate(6 6)"')}</g>`,
  clouds: `<g class="drift">${cloud("#d5dde8", 'transform="translate(-8 -6) scale(.8)"')}${cloud()}</g>`,
  rain: `<g class="drift">${cloud("#cdd8e6")}</g>${drops("line", "drop", "#7cc4ff")}`,
  storm: `<g class="drift">${cloud("#aeb8cc")}</g><polygon class="flash" fill="#ffd45e" points="34,40 26,54 32,54 29,62 40,47 34,47 38,40"/>`,
  snow: `<g class="drift">${cloud("#e6eef7")}</g>${drops("dot", "flake", "#fff", 1)}`,
  mist: `<g stroke="#e3e9f0" stroke-width="3.5" stroke-linecap="round"><line class="slide" x1="14" y1="24" x2="50" y2="24"/><line class="slide" style="animation-delay:-1.3s" x1="10" y1="33" x2="46" y2="33"/><line class="slide" style="animation-delay:-2.6s" x1="16" y1="42" x2="52" y2="42"/></g>`,
};
const icon = (kind, mini = false) => `<svg class="ico${mini ? " mini" : ""}" viewBox="0 0 64 64" aria-hidden="true">${ICONS[kind]}</svg>`;
const kindFor = (ic) => {
  const n = ic.endsWith("n"), c = ic.slice(0, 2);
  if (c === "01") return n ? "clear-night" : "clear-day";
  if (c === "02") return n ? "partly-night" : "partly-day";
  if (c === "03" || c === "04") return "clouds";
  if (c === "09" || c === "10") return "rain";
  if (c === "11") return "storm";
  if (c === "13") return "snow";
  return "mist";
};
const themeFor = (k) => ({ "partly-day": "clear-day", "partly-night": "clear-night" })[k] || k;

/* ---------- render ---------- */
function render(c, w, fc, air) {
  const tz = w.timezone, wt = w.weather[0], m = w.main, kind = kindFor(wt.icon);

  $("cityElement").textContent = c.name;
  $("countryElement").textContent = [c.state, regionNames.of(c.country)].filter(Boolean).join(", ");
  $("timeElement").textContent = `${fmtDay(w.dt, tz, { weekday: "long", day: "numeric", month: "short" })}, ${fmtTime(w.dt, tz)}`;
  $("tempElement").textContent = Math.round(m.temp) + "°";
  $("weathericon").innerHTML = icon(kind);
  $("descElement").textContent = wt.description;
  $("feelsElement").textContent = `Feels like ${Math.round(m.feels_like)}°`;
  $("hiloElement").textContent = `High ${Math.round(m.temp_max)}°, low ${Math.round(m.temp_min)}°`;

  const aqi = air && air.list && air.list[0] && air.list[0].main.aqi;
  const tile = (l, v, s = "", bar) =>
    `<div class="tile"><span>${l}</span><b>${esc(v)}</b>${s ? `<small>${esc(s)}</small>` : ""}${bar != null ? `<div class="bar"><i style="--p:${bar}%"></i></div>` : ""}</div>`;
  const wind = w.wind || {};
  $("tiles").innerHTML = [
    tile("Humidity", m.humidity + "%", "", m.humidity),
    tile("Wind", Math.round((wind.speed || 0) * 3.6) + " km/h",
      [wind.deg != null ? "From " + windDir(wind.deg) : "", wind.gust ? `gusts ${Math.round(wind.gust * 3.6)}` : ""].filter(Boolean).join(", ")),
    tile("Pressure", m.pressure + " hPa"),
    tile("Visibility", w.visibility != null ? (w.visibility / 1000).toFixed(1) + " km" : "n/a"),
    tile("Cloud cover", (w.clouds ? w.clouds.all : 0) + "%", "", w.clouds ? w.clouds.all : 0),
    tile("Air quality", aqi ? AQI[aqi - 1] : "n/a", aqi ? `Index ${aqi} of 5` : ""),
    tile("Sunrise", fmtTime(w.sys.sunrise, tz)),
    tile("Sunset", fmtTime(w.sys.sunset, tz)),
  ].join("");

  $("hourly").innerHTML = fc.list.slice(0, 8).map((e) =>
    `<li><span>${fmtTime(e.dt, tz, { hour: "numeric" })}</span>${icon(kindFor(e.weather[0].icon), true)}<b>${Math.round(e.main.temp)}°</b><small>${Math.round((e.pop || 0) * 100)}%</small></li>`).join("");

  const byDay = {};
  fc.list.forEach((e) => { (byDay[shifted(e.dt, tz).toISOString().slice(0, 10)] ||= []).push(e); });
  const days = Object.values(byDay).slice(0, 5).map((es) => {
    const hr = (e) => shifted(e.dt, tz).getUTCHours();
    const mid = es.reduce((a, b) => (Math.abs(hr(b) - 12) < Math.abs(hr(a) - 12) ? b : a));
    return {
      es, mid,
      hi: Math.max(...es.map((e) => e.main.temp_max)),
      lo: Math.min(...es.map((e) => e.main.temp_min)),
      pop: Math.max(...es.map((e) => e.pop || 0)),
    };
  });
  const min = Math.min(...days.map((d) => d.lo)), max = Math.max(...days.map((d) => d.hi)), span = max - min || 1;
  $("daily").innerHTML = days.map((d, i) =>
    `<li><span>${i === 0 ? "Today" : fmtDay(d.es[0].dt, tz, { weekday: "long" })}</span>${icon(kindFor(d.mid.weather[0].icon.replace("n", "d")), true)}<span class="pop">${Math.round(d.pop * 100)}%</span><div class="range"><i style="--l:${((d.lo - min) / span) * 100}%;--r:${100 - ((d.hi - min) / span) * 100}%"></i></div><span class="t"><em>${Math.round(d.lo)}°</em> ${Math.round(d.hi)}°</span></li>`).join("");

  document.body.dataset.sky = themeFor(kind);
  backImg.classList.remove("ready");
  backImg.src = `backgroundImages/${wt.icon}.jpg`;

  panel.hidden = false;
  panel.classList.remove("loaded");
  void panel.offsetWidth; // restart the entrance animation
  panel.classList.add("loaded");
}

async function loadCity(c) {
  setStatus("Loading…");
  try {
    const p = { lat: c.lat, lon: c.lon };
    const [w, fc, air] = await Promise.all([
      get("/data/2.5/weather", { ...p, units: "metric" }),
      get("/data/2.5/forecast", { ...p, units: "metric" }),
      get("/data/2.5/air_pollution", p).catch(() => null),
    ]);
    render(c, w, fc, air);
    setStatus("");
  } catch (e) {
    setStatus(errText(e));
  }
}

/* ---------- city search with dropdown ---------- */
let timer, seq = 0, items = [], active = -1;

const closeList = () => { list.hidden = true; active = -1; searchInput.setAttribute("aria-expanded", "false"); };
const pick = (c) => { searchInput.value = c.name; items = []; closeList(); loadCity(c); };

function renderList() {
  list.replaceChildren(...items.map((c, i) => {
    const li = document.createElement("li");
    li.id = `opt${i}`;
    li.setAttribute("role", "option");
    const b = document.createElement("b");
    b.textContent = c.name;
    const s = document.createElement("span");
    s.textContent = [c.state, regionNames.of(c.country)].filter(Boolean).join(", ");
    li.append(b, s);
    li.addEventListener("click", () => pick(c));
    return li;
  }));
  list.hidden = !items.length;
  searchInput.setAttribute("aria-expanded", String(items.length > 0));
}

searchInput.addEventListener("input", () => {
  clearTimeout(timer);
  const q = searchInput.value.trim();
  if (q.length < 2) { items = []; closeList(); return; }
  timer = setTimeout(async () => {
    const mine = ++seq;
    try {
      const r = await geocode(q);
      if (mine !== seq) return; // a newer search replaced this one
      const seen = new Set();
      items = r.filter((c) => { const k = `${c.name}|${c.state}|${c.country}`; return !seen.has(k) && seen.add(k); });
      active = -1;
      renderList();
    } catch (e) { setStatus(errText(e)); }
  }, 300);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return closeList();
  if (!items.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
  e.preventDefault();
  list.hidden = false;
  const n = items.length;
  active = e.key === "ArrowDown" ? (active + 1) % n : active <= 0 ? n - 1 : active - 1;
  [...list.children].forEach((li, i) => li.classList.toggle("on", i === active));
  searchInput.setAttribute("aria-activedescendant", `opt${active}`);
  list.children[active].scrollIntoView({ block: "nearest" });
});
searchInput.addEventListener("focus", () => { if (items.length) list.hidden = false; });
document.addEventListener("click", (e) => { if (!form.contains(e.target)) closeList(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (active >= 0) return pick(items[active]);
  const q = searchInput.value.trim();
  if (!q) return;
  try {
    const r = await geocode(q, 1);
    if (r[0]) pick(r[0]);
    else setStatus(`No city found for "${q}". Check the spelling and try again.`);
  } catch (err) { setStatus(errText(err)); }
});

/* ---------- start ---------- */
(async () => {
  if (API_KEY === "YOUR_API_KEY") return setStatus("Add your OpenWeatherMap key to API_KEY in app.js.");
  try {
    const r = await geocode(DEFAULT_CITY, 1);
    if (r[0]) loadCity(r[0]);
  } catch (e) { setStatus(errText(e)); }
})();