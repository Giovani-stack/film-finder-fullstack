// Populate dropdown menu with all the available genres
const populateGenreDropdown = (genres) => {
  const select = document.getElementById('genres')

  for (const genre of genres) {
    let option = document.createElement("option");
    option.value = genre.id;
    option.text = genre.name;
    select.appendChild(option);
  }
};

// Returns the current genre selection from the dropdown menu
const getSelectedGenre = () => {
  const selectedGenre = document.getElementById('genres').value;
  return selectedGenre;
};

// Displays the like and dislike buttons on the page
const showBtns = () => {
  const btnDiv = document.getElementById('likeOrDislikeBtns');
  btnDiv.removeAttribute('hidden');
};

// Clear the current movie from the screen
const clearCurrentMovie = () => {
  const moviePosterDiv = document.getElementById('moviePoster');
  const movieTextDiv = document.getElementById('movieText');
  const carousel = document.getElementById('carousel');
  const movieTitleDiv = document.getElementById('movieTitle');
  const favoritecarousel=document.getElementById('carousel');
  moviePosterDiv.innerHTML = '';
  movieTextDiv.innerHTML = '';
  movieTitleDiv.innerHTML = '';
  carousel.innerHTML = '';
  favoritecarousel.innerHTML='';
}

// After liking a movie, clears the current movie from the screen and gets another random movie
const likeMovie = async (event) => {
  console.log("Clicked Button: ", event.target); // event.target is the Like button
  const movieId = event.target.getAttribute("movieId"); // Get the movie ID from the button
  console.log("Showed movie ID: ", movieId);
  sendLikeToServer(movieId, true); // Send data to server with like = true
  clearCurrentMovie();
  showRandomMovie();
};

// After disliking a movie, clears the current movie from the screen and gets another random movie
const dislikeMovie = (event) => {
  console.log("Clicked Button: ", event.target); // event.target is the Dislike button
  const movieId = document.getElementById("likeBtn").getAttribute("movieId"); // Get the movie ID from the button
  console.log("Showed movie ID: ", movieId);
  sendLikeToServer(movieId, false); // Send data to server with like = false
  clearCurrentMovie();
  showRandomMovie();
};

const sendLikeToServer = async (movieId, like) => {
  const response = await fetch("/api/movie/like", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "movieId": movieId,
      "like": like
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`
    );
  }
};

// Create HTML for movie poster
const createMoviePoster = (posterPath) => {
  const moviePosterUrl = `https://image.tmdb.org/t/p/original/${posterPath}`;

  const posterImg = document.createElement('img');
  posterImg.setAttribute('src', moviePosterUrl);
  posterImg.setAttribute('id', 'moviePoster');

  return posterImg;
};

// Create HTML for movie title
const createMovieTitle = (title) => {
  const titleHeader = document.createElement('h1');
  titleHeader.setAttribute('id', 'movieTitle');
  titleHeader.innerHTML = title;

  return titleHeader;
};

// Create HTML for movie overview
const createMovieOverview = (overview) => {
  const overviewParagraph = document.createElement('p');
  overviewParagraph.setAttribute('id', 'movieOverview');
  overviewParagraph.innerHTML = overview;

  return overviewParagraph;
};

// Returns a random movie from the first page of movies
const getRandomMovie = (movies) => {
  const randomIndex = Math.floor(Math.random() * movies.length);
  const randomMovie = movies[randomIndex];
  return randomMovie;
};

// Uses the DOM to create HTML to display the movie
const displayMovie = (movieInfo) => {
  console.log("showing movie: ", movieInfo);
  const moviePosterDiv = document.getElementById('moviePoster');
  const movieTextDiv = document.getElementById('movieText');
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');

  // Create HTML content containing movie info
  const moviePoster = createMoviePoster(movieInfo.poster_path);
  const movieTitle = createMovieTitle(movieInfo.title);
  const overviewText = createMovieOverview(movieInfo.overview);

  // Append title, poster, and overview to page
  moviePosterDiv.appendChild(moviePoster);
  movieTextDiv.appendChild(movieTitle);
  movieTextDiv.appendChild(overviewText);
  document.getElementById("likeBtn").setAttribute("movieId", movieInfo.id);

  showBtns();
  likeBtn.onclick = likeMovie;
  dislikeBtn.onclick = dislikeMovie;
};


const displayCarousel = (movieDetails) => {
  const carouselDiv = document.getElementById('carousel');
  const carouselItems = document.createElement('div');
  carouselItems.setAttribute('class', 'carousel-items');
  carouselItems.setAttribute('class', 'title');

  for (const movie of movieDetails) {
    const item = document.createElement('li');
    item.setAttribute('class', 'carousel-item');
    item.setAttribute('class', 'title');
    const img = document.createElement('img');
    img.setAttribute('src', `https://image.tmdb.org/t/p/original/${movie.poster_path}`);
    img.setAttribute('height', '200px');
    item.appendChild(img);
    

    const movieInfo = document.createElement('div');
    movieInfo.setAttribute('class', 'title', 'movie-info');
    movieInfo.innerHTML = `<h4>${movie.title} <br><bt>
    ${movie.production_companies[0].name}</h4>`; 
    item.appendChild(movieInfo);

    carouselItems.appendChild(item);
  }

  carouselDiv.appendChild(carouselItems);
};

//scrivo una funzione per visualizzare i film preferiti nel nuovo carosello
const displayRecommendedMovieCarousel = (movieDetails) => {
const newCarouselDiv = document.getElementById('favoritecarousel');
const favoriteCarousel = document.createElement('div');
favoriteCarousel.setAttribute('class', 'title');
newCarouselDiv.appendChild(favoriteCarousel);



}