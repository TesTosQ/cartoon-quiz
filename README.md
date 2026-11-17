# Cartoon Quiz (Kahoot-style)

Players: open the site, type a username, play.  
Host: open `/admin`, log in, press **Start quiz**.

## Run on your own computer
    npm install
    ADMIN_PASSWORD=mysecret npm start      # Windows PowerShell: $env:ADMIN_PASSWORD="mysecret"; npm start
Open http://localhost:3000/admin

## Put it online for friends (free): Render.com
1. Create a GitHub repo and upload this folder (without node_modules).
2. On render.com → New → Web Service → pick the repo.
3. Build command: `npm install`   Start command: `npm start`
4. Environment → add `ADMIN_PASSWORD` = your secret password.
5. Share the URL Render gives you (e.g. https://cartoon-quiz.onrender.com). Host page = that URL + `/admin`.
(Free Render sleeps when idle: open the link ~1 minute before game time.)

## Edit questions
`questions.js` – each question has a list of accepted `answers`. Case, spaces, punctuation, "the" and "&"/"and" are ignored, and small typos are accepted.
Change the timer with env var `QUESTION_SECONDS` (default 30).
