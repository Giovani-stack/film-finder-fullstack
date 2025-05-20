const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // requires `npm install sqlite3`

const DB_NAME = 'movies_database.sqlite';

// Helper function to run SQL commands that return a Promise
function runSql(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('SQL Error:', err.message, 'SQL:', sql, 'Params:', params);
                reject(err);
            } else {
                resolve(this); // this contains lastID and changes
            }
        });
    });
}

async function initDb(dbPath) {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to SQLite database:', err.message);
            throw err;
        }
        console.log(`Connected to ${dbPath} SQLite database.`);
    });

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY,
            name TEXT,
            poster_path TEXT,
            backdrop_path TEXT
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY,
            title TEXT,
            original_title TEXT,
            overview TEXT,
            release_date TEXT,
            runtime INTEGER,
            budget INTEGER,
            revenue INTEGER,
            tagline TEXT,
            status TEXT,
            popularity REAL,
            vote_average REAL,
            vote_count INTEGER,
            adult INTEGER,
            video INTEGER,
            imdb_id TEXT UNIQUE,
            homepage TEXT,
            original_language TEXT,
            poster_path TEXT,
            backdrop_path TEXT,
            collection_id INTEGER,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS genres (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movie_genres (
            movie_id INTEGER,
            genre_id INTEGER,
            PRIMARY KEY (movie_id, genre_id),
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
            FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS countries (
            iso_3166_1 TEXT PRIMARY KEY,
            name TEXT
        );
    `);
    // Ensure unique name for countries if not null, or allow multiple nulls
    // For simplicity, name uniqueness is not enforced strictly here to avoid issues with multiple sources providing only code

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS production_companies (
            id INTEGER PRIMARY KEY,
            name TEXT,
            logo_path TEXT,
            origin_country_iso_3166_1 TEXT,
            FOREIGN KEY (origin_country_iso_3166_1) REFERENCES countries(iso_3166_1) ON DELETE SET NULL
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movie_production_companies (
            movie_id INTEGER,
            company_id INTEGER,
            PRIMARY KEY (movie_id, company_id),
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
            FOREIGN KEY (company_id) REFERENCES production_companies(id) ON DELETE CASCADE
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movie_production_countries (
            movie_id INTEGER,
            country_iso_code TEXT,
            PRIMARY KEY (movie_id, country_iso_code),
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
            FOREIGN KEY (country_iso_code) REFERENCES countries(iso_3166_1) ON DELETE CASCADE
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movie_origin_countries (
            movie_id INTEGER,
            country_iso_code TEXT,
            PRIMARY KEY (movie_id, country_iso_code),
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
            FOREIGN KEY (country_iso_code) REFERENCES countries(iso_3166_1) ON DELETE CASCADE
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS spoken_languages (
            iso_639_1 TEXT PRIMARY KEY,
            english_name TEXT,
            name TEXT
        );
    `);

    await runSql(db, `
        CREATE TABLE IF NOT EXISTS movie_spoken_languages (
            movie_id INTEGER,
            language_iso_code TEXT,
            PRIMARY KEY (movie_id, language_iso_code),
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
            FOREIGN KEY (language_iso_code) REFERENCES spoken_languages(iso_639_1) ON DELETE CASCADE
        );
    `);

    console.log('Database tables created or already exist.');
    return db;
}

async function importMovieData(db, movieData) {
    const movieId = movieData.id;

    // Begin transaction
    await runSql(db, 'BEGIN TRANSACTION');

    try {
        // 0. Collection
        let collectionIdToStore = null;
        if (movieData.belongs_to_collection && movieData.belongs_to_collection.id) {
            const coll = movieData.belongs_to_collection;
            await runSql(db,
                'INSERT OR IGNORE INTO collections (id, name, poster_path, backdrop_path) VALUES (?, ?, ?, ?)',
                [coll.id, coll.name, coll.poster_path, coll.backdrop_path]
            );
            collectionIdToStore = coll.id;
        }

        // 1. Movie
        await runSql(db, `
            INSERT OR IGNORE INTO movies (
                id, title, original_title, overview, release_date, runtime, budget, revenue,
                tagline, status, popularity, vote_average, vote_count, adult, video,
                imdb_id, homepage, original_language, poster_path, backdrop_path, collection_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            movieId, movieData.title, movieData.original_title, movieData.overview, movieData.release_date,
            movieData.runtime, movieData.budget, movieData.revenue, movieData.tagline, movieData.status,
            movieData.popularity, movieData.vote_average, movieData.vote_count,
            movieData.adult ? 1 : 0, movieData.video ? 1 : 0,
            movieData.imdb_id, movieData.homepage, movieData.original_language,
            movieData.poster_path, movieData.backdrop_path, collectionIdToStore
        ]);

        // 2. Genres
        if (movieData.genres && Array.isArray(movieData.genres)) {
            for (const genre of movieData.genres) {
                await runSql(db, 'INSERT OR IGNORE INTO genres (id, name) VALUES (?, ?)', [genre.id, genre.name]);
                await runSql(db, 'INSERT OR IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieId, genre.id]);
            }
        }

        // 3. Countries (central table) - first pass for codes from various sources
        // Production Countries
        if (movieData.production_countries && Array.isArray(movieData.production_countries)) {
            for (const country of movieData.production_countries) {
                // Insert or update country name if provided
                await runSql(db,
                    'INSERT INTO countries (iso_3166_1, name) VALUES (?, ?) ON CONFLICT(iso_3166_1) DO UPDATE SET name = excluded.name WHERE countries.name IS NULL OR countries.name != excluded.name',
                    [country.iso_3166_1, country.name]
                );
                await runSql(db, 'INSERT OR IGNORE INTO movie_production_countries (movie_id, country_iso_code) VALUES (?, ?)', [movieId, country.iso_3166_1]);
            }
        }

        // Movie Origin Countries (these only provide codes)
        if (movieData.origin_country && Array.isArray(movieData.origin_country)) {
            for (const countryCode of movieData.origin_country) {
                await runSql(db, 'INSERT OR IGNORE INTO countries (iso_3166_1, name) VALUES (?, NULL)', [countryCode]); // Name might be NULL
                await runSql(db, 'INSERT OR IGNORE INTO movie_origin_countries (movie_id, country_iso_code) VALUES (?, ?)', [movieId, countryCode]);
            }
        }

        // 4. Production Companies
        if (movieData.production_companies && Array.isArray(movieData.production_companies)) {
            for (const company of movieData.production_companies) {
                if (company.origin_country) { // company.origin_country is a code like "DE"
                     await runSql(db, 'INSERT OR IGNORE INTO countries (iso_3166_1, name) VALUES (?, NULL)', [company.origin_country]);
                }
                await runSql(db,
                    'INSERT OR IGNORE INTO production_companies (id, name, logo_path, origin_country_iso_3166_1) VALUES (?, ?, ?, ?)',
                    [company.id, company.name, company.logo_path, company.origin_country]
                );
                await runSql(db, 'INSERT OR IGNORE INTO movie_production_companies (movie_id, company_id) VALUES (?, ?)', [movieId, company.id]);
            }
        }

        // 5. Spoken Languages
        if (movieData.spoken_languages && Array.isArray(movieData.spoken_languages)) {
            for (const lang of movieData.spoken_languages) {
                await runSql(db,
                    'INSERT OR IGNORE INTO spoken_languages (iso_639_1, english_name, name) VALUES (?, ?, ?)',
                    [lang.iso_639_1, lang.english_name, lang.name]
                );
                await runSql(db, 'INSERT OR IGNORE INTO movie_spoken_languages (movie_id, language_iso_code) VALUES (?, ?)', [movieId, lang.iso_639_1]);
            }
        }

        // Commit transaction
        await runSql(db, 'COMMIT');
        console.log(`Successfully imported movie ID: ${movieId} - ${movieData.title}`);

    } catch (error) {
        await runSql(db, 'ROLLBACK');
        console.error(`Failed to import movie ID: ${movieId} - ${movieData.title}. Error: ${error.message}`);
        // console.error(error.stack); // for more details
    }
}


async function scanAndImport(folderPath, db) {
    try {
        const files = await fs.readdir(folderPath);
        const jsonFiles = files.filter(file => /^movie-\d+\.json$/.test(file));

        if (jsonFiles.length === 0) {
            console.log(`No movie JSON files found in ${folderPath} matching the 'movie-{id}.json' pattern.`);
            return;
        }

        console.log(`Found ${jsonFiles.length} movie JSON files to process.`);

        for (const fileName of jsonFiles) {
            const filePath = path.join(folderPath, fileName);
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const movieData = JSON.parse(fileContent);

                // As per prompt, each file is one movie object directly
                await importMovieData(db, movieData);

            } catch (parseError) {
                console.error(`Error parsing JSON from file ${fileName}: ${parseError.message}`);
            }
        }
    } catch (err) {
        console.error(`Error reading folder ${folderPath}: ${err.message}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Please provide the folder path containing JSON files.');
        console.log('Usage: node script.js <folder_path> [database_file_path]');
        return;
    }

    const folderPath = args[0];
    const dbFilePath = args[1] || DB_NAME; // Use default DB_NAME if not provided

    let db;
    try {
        db = await initDb(dbFilePath);
        await scanAndImport(folderPath, db);
    } catch (err) {
        console.error('An unexpected error occurred:', err);
    } finally {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        }
    }
}

main();
