const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");
const QUESTIONS = require("./questions");
const { isCorrect } = require("./match");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const QUESTION_SECONDS = Number(process.env.QUESTION_SECONDS || 30);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));
app.get("/admin", (_, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

// ---------- game state ----------
const players = new Map(); // id -> {id,name,score,connected,socketId}
let game = fresh();
let timer = null;

function fresh() {
  return { phase: "lobby", q: -1, endsAt: 0, answers: new Map() }; // answers: id -> {text, correct}
}

const safeEq = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

function ranked() {
  const list = [...players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  let rank = 0, last = null;
  return list.map((p, i) => {
    if (p.score !== last) { rank = i + 1; last = p.score; }
    return { id: p.id, name: p.name, score: p.score, rank };
  });
}

function stateFor(socket) {
  const isAdmin = !!socket.data.admin;
  const q = QUESTIONS[game.q];
  const s = {
    phase: game.phase,
    index: game.q,
    total: QUESTIONS.length,
    seconds: QUESTION_SECONDS,
    remainingMs: game.phase === "question" ? Math.max(0, game.endsAt - Date.now()) : 0,
    playerCount: [...players.values()].filter((p) => p.connected).length,
    question: q && game.phase !== "lobby" && game.phase !== "finished" ? { img: q.img || null, audio: q.audio || null, prompt: q.prompt } : null,
  };
  if (game.phase === "reveal" || game.phase === "finished") s.leaderboard = ranked();
  if (game.phase === "reveal") s.correctAnswer = q.display;
  if (game.phase === "finished") {
    const lb = ranked();
    const top = lb.length ? lb[0].score : 0;
    s.winners = lb.filter((p) => p.score === top).map((p) => p.name);
    s.topScore = top;
  }
  if (isAdmin) {
    s.admin = true;
    if (q && game.phase === "question") s.correctAnswer = q.display;
    s.players = [...players.values()].map((p) => {
      const a = game.answers.get(p.id);
      return { id: p.id, name: p.name, score: p.score, connected: p.connected, answered: !!a, correct: game.phase === "reveal" && a ? a.correct : undefined, text: game.phase === "reveal" && a ? a.text : undefined };
    });
    s.answeredCount = game.answers.size;
  } else {
    const me = players.get(socket.data.playerId);
    if (me) {
      const a = game.answers.get(me.id);
      s.me = { id: me.id, name: me.name, score: me.score, answered: !!a };
      if (game.phase === "reveal") { s.me.correct = a ? a.correct : false; s.me.text = a ? a.text : null; }
      const lb = ranked().find((p) => p.id === me.id);
      s.me.rank = lb ? lb.rank : null;
    }
  }
  return s;
}

function broadcast() {
  for (const [, socket] of io.sockets.sockets) socket.emit("state", stateFor(socket));
}

function startQuestion() {
  game.phase = "question";
  game.answers = new Map();
  game.endsAt = Date.now() + QUESTION_SECONDS * 1000;
  clearTimeout(timer);
  timer = setTimeout(reveal, QUESTION_SECONDS * 1000 + 150);
  broadcast();
}

function reveal() {
  if (game.phase !== "question") return;
  clearTimeout(timer);
  game.phase = "reveal";
  broadcast();
}

function next() {
  if (game.phase === "lobby") { game.q = 0; startQuestion(); }
  else if (game.phase === "reveal") {
    if (game.q + 1 >= QUESTIONS.length) { game.phase = "finished"; broadcast(); }
    else { game.q++; startQuestion(); }
  }
}

function checkAllAnswered() {
  const online = [...players.values()].filter((p) => p.connected);
  if (online.length && online.every((p) => game.answers.has(p.id))) setTimeout(reveal, 600);
}

// ---------- sockets ----------
io.on("connection", (socket) => {
  socket.emit("state", stateFor(socket));

  socket.on("join", ({ id, name } = {}, cb = () => {}) => {
    name = String(name || "").trim().replace(/\s+/g, " ").slice(0, 20);
    id = String(id || "").slice(0, 64);
    if (!name || !id) return cb({ ok: false, error: "Enter a username." });
    const existing = players.get(id);
    const clash = [...players.values()].find((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== id);
    if (clash) return cb({ ok: false, error: "That username is taken. Try another one." });
    if (existing) { existing.name = name; existing.connected = true; existing.socketId = socket.id; }
    else players.set(id, { id, name, score: 0, connected: true, socketId: socket.id });
    socket.data.playerId = id;
    cb({ ok: true });
    broadcast();
  });

  socket.on("answer", (text, cb = () => {}) => {
    const p = players.get(socket.data.playerId);
    if (!p || game.phase !== "question" || Date.now() > game.endsAt + 300) return cb({ ok: false });
    if (game.answers.has(p.id)) return cb({ ok: false });
    text = String(text || "").trim().slice(0, 80);
    if (!text) return cb({ ok: false });
    const correct = isCorrect(text, QUESTIONS[game.q].answers);
    game.answers.set(p.id, { text, correct });
    if (correct) p.score += 1; // +1 correct, +0 wrong
    cb({ ok: true });
    broadcast();
    checkAllAnswered();
  });

  // admin
  socket.on("admin:login", (pw, cb = () => {}) => {
    if (safeEq(pw, ADMIN_PASSWORD)) { socket.data.admin = true; cb({ ok: true }); socket.emit("state", stateFor(socket)); }
    else cb({ ok: false });
  });
  const guard = (fn) => (...a) => { if (socket.data.admin) fn(...a); };
  socket.on("admin:next", guard(next));
  socket.on("admin:skip", guard(reveal));
  socket.on("admin:reset", guard(() => {
    clearTimeout(timer);
    for (const p of players.values()) p.score = 0;
    game = fresh();
    broadcast();
  }));
  socket.on("admin:kick", guard((id) => {
    const p = players.get(id);
    if (!p) return;
    players.delete(id);
    game.answers.delete(id);
    const s = io.sockets.sockets.get(p.socketId);
    if (s) { s.data.playerId = null; s.emit("kicked"); }
    broadcast();
  }));

  socket.on("disconnect", () => {
    const p = players.get(socket.data.playerId);
    if (p && p.socketId === socket.id) {
      p.connected = false;
      if (game.phase === "lobby") players.delete(p.id); // leave lobby = gone
      broadcast();
      if (game.phase === "question") checkAllAnswered();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Cartoon Quiz running on http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}/admin  (password: ${ADMIN_PASSWORD === "admin123" ? "admin123 — change it with ADMIN_PASSWORD" : "set via ADMIN_PASSWORD"})`);
});
