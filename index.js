//helooo Vietnamm!!
//insert new function in this js file
//have to modify this file
console.log("App starting...");
const express = require('express');
const fs = require('node:fs');
const bodyParser = require('body-parser');
const sqlite = require('sqlite3');
const dbPath = ('C:\\Users\\utente\\Desktop\\dev\\database\\database2500')
// Create a connection to an in-memory database
const libraryDB = new sqlite.Database(dbPath);

const app = express()
const port = 3000
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const tmdbKey = '4048775a0f068af3048837ff0341a4f7';
const tmdbBaseUrl = 'https://api.themoviedb.org/3';

app.get('/genre/movie/list',  (req, res) => {
  libraryDB.all("SELECT * FROM genres", (err, genres) => {
    if (err) {
      console.error("Error fetching genres: ", err);
      return res.status(500).send("Error fetching genres");
    }
    console.log("Genres fetched from database: ", genres);
    res.json({ genres });
  });
});


app.get('/movie/:movieId', async (req, res) => {
  console.log("/movie/movieId ", req.params.movieId);
  console.log("I parametri sono: ", req.params);
  const movieId = req.params.movieId;
  // controllo se esiste il file `data/movie-${movieId}.json`
  // SE NON ESISTE (devo usare fs.statSync...) --> lo scarico con fetch ()
  // SE ESISTE --> non faccio nulla

  // SE IL FILE NON ESISTE
  try {
    fs.statSync(`data/movie-${movieId}.json`);
    console.log("trovato il file!")
  } catch (error) {
    // ALLORA LO SCARICO
    // il file non esiste --> lo scarichiamo
    console.log("Getting movie details for ", movieId);
    const movieEndpoint = `/movie/${movieId}`;
    const requestParams = `?api_key=${tmdbKey}`;
    const url = tmdbBaseUrl + movieEndpoint + requestParams;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const jsonResponse = await response.json();
        console.log("Got movie info: ", jsonResponse);
        fs.writeFileSync(`data/movie-${movieId}.json`, JSON.stringify(jsonResponse));
      }
    } catch (e) {
      console.log(" Error getting movie info: ", e);
    }
  }

  // INFINE procedo RESISTUENDO il contenuto del file
  const dataAsText = fs.readFileSync(`data/movie-${movieId}.json`, 'utf8');
  const movieData = JSON.parse(dataAsText);
  res.send(movieData)
});


//CREATED NEW FUNCTION GENREMOVIES
const getMoviesFromGenre = (genreId) => {
  console.log("Getting movies from genreId: ", genreId);
  const dataAsText = fs.readFileSync(`data/genre-movies-${genreId}.json`, 'utf8');
  console.log("you got the movie id");
  const genreMovies = JSON.parse(dataAsText);
  return genreMovies;
}


app.get('/discover/movie', (req, res) => {
  const id = req.query.with_genres;
  if (!id) {
    console.error("Missing id");
    return res.status(400).send("Missing id");
  }
  libraryDB.all("SELECT * FROM movies WHERE id = ?", [id], (err, movies) => {
    if (err) {
      console.error("Error fetching movies: ", err);
      return res.status(500).send("Error fetching movies");
    }
    console.log("Movies fetched from database: ", movies);
    res.json({ movies });
  });
});


  /*console.log("Params: ", req.query)
  const genreId = req.query.with_genres; // <-- SECURITY THREAT
  const genreMovies = getMoviesFrom(genreId);
  res.send(genreMovies);*/


app.post('/api/movie/like', (req, res) => {
  console.log("MovieId from request body: ", req.body.movieId);
  console.log("Like from request body: ", req.body.like);
  const responseObj = { message: 'Data received successfully', yourData: req.body };
  try {
    const votesText = fs.readFileSync(`data/votes.json`, 'utf8');
    const votesObj = JSON.parse(votesText);
    console.log("votesObj BEFORE PUSH", votesObj);
    if (req.body.like) { // check if the user liked or disliked the movie
      votesObj.likes.push(req.body.movieId); // add the movieId to the likes array
    } else {
      votesObj.dislikes.push(req.body.movieId); // add the movieId to the dislikes array
    }
    console.log("votesObj AFTER PUSH", votesObj);
    fs.writeFileSync("data/votes.json", JSON.stringify(votesObj));
    console.log("Fine scrittura file")
  }
  catch (err) {
    console.log("Error: ", err);
  }
  res.status(200).json(responseObj);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`) // http://localhost:3000
});

const movieToGenreIds = (movieId) => {
  const movieDataAsText = fs.readFileSync(`data/movie-${movieId}.json`, 'utf8');
  const movieObj = JSON.parse(movieDataAsText);
  const genresIds = movieObj.genres.map(g => g.id);
  return genresIds;
}

const readVotesFromFile = () => {
  const votesDataAsText = fs.readFileSync('data/votes.json', 'utf8');
  const votesData = JSON.parse(votesDataAsText);
  console.log(votesData);
  return votesData;
}


app.get('/recommendations', (req, res) => {
  const votedData = readVotesFromFile();
  const likedMovieIds = votedData.likes;
  const dislikedMovieIds = votedData.dislikes;
  console.log("Liked movie IDs: ", likedMovieIds);
  const likedGenresIds = likedMovieIds.map(movieToGenreIds).flat();
  console.log("Liked genres IDs: ", likedGenresIds);
  // Qui estraiamo il generere più frequente tra i generi dei film che l'utente ha messo "mi piace"
  const mostFrequent = mostFrequentGenre(likedGenresIds);
  console.log("Most frequent genre ID: ", mostFrequent);
  // Ora dobbiamo trovare i film di quel genere
  const genreMoviesData = getMoviesFromGenre(mostFrequent);
  console.log("Genre movies data: ", genreMoviesData);
  // Infine, restituiamo i primi 5 film di quel genere escludendo quelli che l'utente ha già messo "mi piace"
  const votedMovieIds = likedMovieIds.concat(dislikedMovieIds);
  console.log("Voted movie IDs: ", votedMovieIds);
  const recommendedMovies = genreMoviesData.results.filter(
    movie => !votedMovieIds.includes(movie.id.toString())
  ).slice(0, 5);
  console.log("Recommended movies: ", recommendedMovies);
  res.status(200).json({ suggestedMovies: recommendedMovies });
});


// se input [16, 28, 99, 28, 16, 28]
// allora la frequenza di 16 è 2, la frequenza di 28 è 3, la frequenza di 99 è 1
// allora output è: 28
const mostFrequentGenre = (genreIds) => {
  const frequency = {};
  let maxCount = 0;
  let mostFrequent;

  for (let i = 0; i < genreIds.length; i++) {
    const genreId = genreIds[i];
    frequency[genreId] = (frequency[genreId] || 0) + 1;
    console.log("Frequency: ", frequency);
    // Trovo il genere più frequente
    if (frequency[genreId] > maxCount) {
      maxCount = frequency[genreId];
      mostFrequent = genreId;
    }
  }
  return mostFrequent;
}
