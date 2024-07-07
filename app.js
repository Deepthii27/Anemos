let API_KEY = "7570ca40b046a23d9acd58db170c9bc4"
// console.log("Hii BPT",API_KEY);

let res = fetch(`https://api.openweathermap.org/data/2.5/weather?q={city name}&appid=${API_KEY}`)