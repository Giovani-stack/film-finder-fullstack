console.log("App starting...");
const express = require('express');
const fs = require('node:fs');
const bodyParser = require('body-parser');

const tmdbBaseUrl = 'https://api.themoviedb.org/3';
const tmdbKey = '4048775a0f068af3048837ff0341a4f7';

const app = express()
const port = 3000
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/genre/movie/list', (req, res) => {
  console.log(req.query);
  const dataAsText = fs.readFileSync('data/genres.json', 'utf8');
  const genres = JSON.parse(dataAsText);
  res.send(genres)
});

app.get('/discover/movie', async (req, res) => {
  console.log("/discover/movie params: ", req.query)
  const genreId = req.query.with_genres; // <-- SECURITY THREAT!
  const filePath = `data/genre-movies-${genreId}.json`;
  if (fs.existsSync(filePath)) {
    console.log(`Found movies for genre ${genreId} in local DB! YAY!`);
  } else {
    console.log(`Can not find movies for genre ${genreId}: fetch from themoviedb!`)
    const discoverMovieEndpoint = '/discover/movie';
    const requestParams = `?api_key=${tmdbKey}&with_genres=${genreId}`;
    const urlToFetch = tmdbBaseUrl + discoverMovieEndpoint + requestParams;
    try {
      const response = await fetch(urlToFetch);
      if (response.ok) {
        const jsonResponse = await response.json();
        const movies = jsonResponse.results;
        console.log(`Got ${movies.length} movies for genre ${genreId}`);
        fs.writeFileSync(filePath, JSON.stringify(jsonResponse))
      }
    } catch (e) {
      console.log(" Error while getting movies: ", e);
    }
  }
  const dataAsText = fs.readFileSync(filePath, 'utf8');
  const genreMovies = JSON.parse(dataAsText);
  res.send(genreMovies);
})

app.get('/movie/:id', async (req, res) => {
  console.log("/movie/:id params ", req.params)
  const movieId = req.params.id;
  const filePath = `data/movie-${movieId}.json`;
  if (fs.existsSync(filePath)) {
    console.log(`Found movie ${movieId} in local DB! YAY!`);
  } else {
    try {
      console.log(`Can not find movie ${movieId}: fetch from themoviedb!`)
      const movieEndpoint = `/movie/${movieId}`;
      const requestParams = `?api_key=${tmdbKey}`;
      const urlToFetch =  tmdbBaseUrl + movieEndpoint + requestParams;
      const response = await fetch(urlToFetch);
      if (response.ok) {
        const jsonResponse = await response.json();
        console.log("Got movie info from themoviedb --> storing to local");
        fs.writeFileSync(filePath, JSON.stringify(jsonResponse))
      }
    } catch (e) {
      console.log(" Error getting movie info: ", e);
    }
  }
  const dataAsText = fs.readFileSync(filePath, 'utf8');
  const movieObj = JSON.parse(dataAsText);
  res.json(movieObj);
})


app.post('/api/movie/like', (req, res) => {
 console.log("Request body: ", req.body.movieId);
 const responseObj = { message: 'Data received successfully', yourData: req.body };
 try {
  const votesText = fs.readFileSync(`data/votes.json`, 'utf8');
  const votesObj = JSON.parse(votesText);
  console.log("votesObj BEFORE PUSH", votesObj);
  votesObj.likes.push(req.body.movieId);
  console.log("votesObj AFTER PUSH", votesObj);
  fs.writeFileSync("data/votes.json", JSON.stringify(votesObj));
  console.log("Fine scrittura file") // Non lo stampa
 }
 catch (err) {
  console.log("Error: ", err);
 }
 res.status(200).json(responseObj);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`) // http://localhost:3000
});
