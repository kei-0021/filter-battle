import express from "express";
import http from "http";
import { Server } from "socket.io";
import { topics, type TopicWithFilters } from "./data/topic";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

type Player = { id: string; name: string };

let players: Player[] = [];
let hostId: string | null = null;
const readyPlayers = new Set<string>();
let currentTopic: TopicWithFilters | null = null;
let currentFilter: string | null = null;
const cards: { [playerId: string]: string } = {};
let hiddenCards: { [playerId: string]: string } = {};
const submittedPlayers = new Set<string>();
let submitTimer: NodeJS.Timeout | null = null;
const SUBMIT_TIMEOUT_MS = 30_000;

function pickRandomTopic() {
  return topics[Math.floor(Math.random() * topics.length)];
}

function pickRandomFilter(topic: TopicWithFilters | null) {
  if (!topic || topic.filters.length === 0) return null;
  const idx = Math.floor(Math.random() * topic.filters.length);
  return topic.filters[idx];
}

function startSubmitPhase() {
  hiddenCards = {};
  submittedPlayers.clear();
  if (submitTimer) {
    clearTimeout(submitTimer);
  }
  console.log("[startSubmitPhase] 既存タイマークリア");
  submitTimer = setTimeout(() => {
    console.log("[startSubmitPhase] タイマー終了、カード公開");
    revealCards();
  }, SUBMIT_TIMEOUT_MS);
}

function revealCards() {
  Object.assign(cards, hiddenCards);
  const revealed = { ...cards };  // 👈 新しいオブジェクトを作る
  hiddenCards = {};
  io.emit("cards_update", revealed);  // 👈 こっちを送る
  io.emit("submitted_update", Array.from(submittedPlayers));
  io.emit("reveal_cards", revealed);  // 👈 こっちも
  console.log("[revealCards] カード公開:", revealed);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    players.push({ id: socket.id, name });
    console.log(`[join] ${name} (${socket.id}) が参加`);
    if (players.length === 1) {
      hostId = socket.id;
      currentTopic = pickRandomTopic();
      currentFilter = pickRandomFilter(currentTopic);
      startSubmitPhase();
      console.log("[join] 最初の参加者、submitフェーズ開始");
    }
    io.emit("players_update", { players, hostId });
    io.emit("topic_update", currentTopic);
    io.emit("filter_update", currentFilter);
    io.emit("cards_update", cards);
    io.emit("submitted_update", Array.from(submittedPlayers));
  });

  socket.on("ready_for_restart", () => {
    readyPlayers.add(socket.id);
    const readyCount = readyPlayers.size;
    const totalCount = players.length;
    io.emit("ready_status", { readyCount, totalCount });

    if (readyCount === totalCount) {
      console.log("All players ready! Restarting game...");
      const random = players[Math.floor(Math.random() * players.length)];
      hostId = random.id;
      currentTopic = pickRandomTopic();
      currentFilter = pickRandomFilter(currentTopic);
      readyPlayers.clear();
      for (const pid in cards) delete cards[pid];
      hiddenCards = {};
      submittedPlayers.clear();
      io.emit("players_update", { players, hostId });
      io.emit("topic_update", currentTopic);
      io.emit("filter_update", currentFilter);
      io.emit("cards_update", cards);
      io.emit("submitted_update", Array.from(submittedPlayers));
      io.emit("game_restarted");

      startSubmitPhase();
    }
  });

  socket.on("submit_card", (card: string) => {
    hiddenCards[socket.id] = card;
    submittedPlayers.add(socket.id);
    const submittedCount = submittedPlayers.size;
    console.log(
      `[submit_card] ${socket.id} 提出: ${card}, 提出数: ${submittedCount} / ${players.length}`
    );
    if (submittedCount === players.length) {
      if (submitTimer) clearTimeout(submitTimer);
      revealCards();
    } else {
      io.emit("submitted_update", Array.from(submittedPlayers));
    }
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);
    delete cards[socket.id];
    delete hiddenCards[socket.id];
    submittedPlayers.delete(socket.id);
    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
    } else if (players.length === 0) {
      hostId = null;
      currentTopic = null;
      currentFilter = null;
      hiddenCards = {};
      submittedPlayers.clear();
      if (submitTimer) clearTimeout(submitTimer);
    }
    io.emit("players_update", { players, hostId });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
    io.emit("topic_update", currentTopic);
    io.emit("filter_update", currentFilter);
    io.emit("cards_update", cards);
    io.emit("submitted_update", Array.from(submittedPlayers));
  });
});

server.listen(3001, () => {
  console.log("✅ Server listening on port 3001");
});
