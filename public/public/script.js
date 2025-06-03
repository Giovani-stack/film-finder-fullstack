const tmdbKey = '4048775a0f068af3048837ff0341a4f7';
const tmdbBaseUrl = 'https://api.themoviedb.org/3';
const tmdbBaseLocale = 'http://localhost:3000';

const playBtn = document.getElementById('playBtn');

const getGenres = async () => {
  const genreRequestEndpoint = '/genre/movie/list';
  const queryString = `?api_key=${tmdbKey}`;
  //  const urlToFetch = tmdbBaseUrl + genreRequestEndpoint + queryString;
  const url = tmdbBaseUrl + genreRequestEndpoint + queryString;
  //  return [];
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(" GOT RESPONSE: " + response.body);
      const jsonResponse = await response.json();
      console.log("Got response: ", jsonResponse);
      const genreList = jsonResponse["genres"];
      console.log("Genres are: ", genreList);
      return genreList;
    }
  } catch (e) {
    console.log("ERROR ", e);
  }
};

const getMovies = async () => {
  const selectedGenre = getSelectedGenre();
  const discoverMovieEndpoint = '/discover/movie';
  const requestParams = `?api_key=${tmdbKey}&with_genres=${selectedGenre}`;
  // const urlToFetch = tmdbBaseUrl+discoverMovieEndpoint+requestParams;
  const url = tmdbBaseUrl + discoverMovieEndpoint + requestParams;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const jsonResponse = await response.json();
      console.log(" Got discover movie response ", jsonResponse);
      const movies = jsonResponse.results;
      console.log(" Got movies: ", movies);
      return movies;
    }

  } catch (e) {
    console.log(" Error while getting movies: ", e);
  }
};


const getMovieInfo = async (movie) => {
  console.log("Getting movie details for ", movie);
  const movieId = movie.id;
  const movieEndpoint = `/movie/${movieId}`;
  const requestParams = `?api_key=${tmdbKey}`;
  const url = tmdbBaseLocale + movieEndpoint + requestParams;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const jsonResponse = await response.json();
      console.log("Got movie info: ", jsonResponse);
      return jsonResponse;
    }

  } catch (e) {
    console.log(" Error getting movie info: ", e);
  }
};

const getMovieDetails = async (movies) => {
  const movieDetails = [];
  for (const movie of movies) {
    const details = await getMovieInfo(movie);
    movieDetails.push(details);
  }
  return movieDetails;
};

// Gets a list of movies and ultimately displays the info of a random movie from the list
const showRandomMovie = async () => {
  console.log(" goin to show random movie...");
  const movieInfo = document.getElementById('movieInfo');
  if (movieInfo.childNodes.length > 0) {
    clearCurrentMovie();
  };
  const movies = await getMovies(); // prendo i films
  const randomMovie = await getRandomMovie(movies);  // ne seleziono uno
  // const info = await getMovieInfo(randomMovie);
  // displayMovie(info);
  displayMovie(randomMovie); // lo visualizzo

  // scarico i dettagli completi dei pprimi cinque film
  const movieDetails = await getMovieDetails(movies);
  displayCarousel(movieDetails); // visualizzo il carosello
  getRecommendedMovies();
}

//aggiungo una funzione async per far uscire i movies a cui metto like
const getRecommendedMovies = async () => {
const likeMovieEndPoint = '/recommendations';
const urlToFetch= tmdbBaseLocale+ likeMovieEndPoint; 
  try {
    const response = await fetch(urlToFetch);
    if (response.ok) {
      const suggestedMovies = await response.json();
      console.log(" Going to show new carousel", suggestedMovies.suggestedMovies);
      displayRecommendedMovieCarousel(suggestedMovies.suggestedMovies);
      //return newCarousel;
    }

  } catch (e) {
    console.log(" Error while getting new carousel: ", e);
  }
};


//scrivo una funzione per visualizzare il nuovo carosello  
// const recommendendMovies= await getRecommendedMovies();
// console.log("Going to display recommended movies: ", recommendendMovies);
// displayRecommendedMovieCarousel();
//esce il carosello dei film piaciuti





getGenres().then(populateGenreDropdown);

playBtn.onclick = showRandomMovie;
