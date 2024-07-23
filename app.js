let API_KEY = "7570ca40b046a23d9acd58db170c9bc4"

const searchElement=document.getElementById("searchbar")
const searchBtnElement=document.getElementById("searchbtn")

searchBtnElement.addEventListener("click",(e)=>{
    e.preventDefault()
    let query = searchElement.value    
    fetchWeather(query)
})

const fetchWeather = async (query) =>{
    console.log(query)

    const result = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${API_KEY}`)).json()
    console.log(result)

    const TempElement = document.getElementById("tempElement")
    TempElement.innerText = Math.round(result.main.temp-273.15) + "° C";
    const CityElement = document.getElementById("cityElement")
    CityElement.innerText= result.sys.country;
}