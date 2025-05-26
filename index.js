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

const movieToGenreIds = (movieId) => {
  const movieDataAsText = fs.readFileSync(`data/movie-${movieId}.json`, 'utf8');
  const movieObj = JSON.parse(movieDataAsText);
  const genresIds = movieObj.genres.map(g => g.id);
  return genresIds;
}

const getMostFrequentId = (ids) => {
  const counts = {};
  let mostFrequentId = null;
  let maxFrequence = 0;

  for (const id of ids) {
    counts[id] = (counts[id] || 0) + 1;
    if (counts[id] > maxFrequence) {
      maxFrequence = counts[id];
      mostFrequentId = id;
    }
  }

  return mostFrequentId;
};

// Check Fisher–Yates shuffle algorithm https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
const shuffle = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements at indices i and j
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}


app.get('/recommendations', (req, res) => {
  const votesDataAsText = fs.readFileSync('data/votes.json', 'utf8');
  const votes = JSON.parse(votesDataAsText);
  const likedMoviesIds = votes.likes;
  const likedGenresIds = likedMoviesIds.map(movieToGenreIds).flat();
  const mostLikedGenreId = getMostFrequentId(likedGenresIds);

  if (!mostLikedGenreId) return [];
  console.log(mostLikedGenreId)
  const mostLikedGenreMoviesAsTest = fs.readFileSync(`data/genre-movies-${mostLikedGenreId}.json`, 'utf8');
  const mostLikedGenreMovies = JSON.parse(mostLikedGenreMoviesAsTest);
  console.log(mostLikedGenreMovies)
  const recommendedMovies = mostLikedGenreMovies.results.filter(movie => !likedMoviesIds.includes(movie.id));
  const shuffledRecommendedMovies = shuffle(recommendedMovies);
  const recommendations = shuffledRecommendedMovies.slice(0, 5);

  res.send(recommendations)
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
      const urlToFetch = tmdbBaseUrl + movieEndpoint + requestParams;
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
