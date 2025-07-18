import express from "express";
import http from "http";
import { Server } from "socket.io";
import { topics, type Topic } from "./data/topic";

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
let currentTopic: Topic | null = null;
const cards: { [playerId: string]: string } = {};  // 公開カード
let hiddenCards: { [playerId: string]: string } = {};  // 提出済みだが未公開カード
const submittedPlayers = new Set<string>(); // 追加：提出済みプレイヤー管理
let submitTimer: NodeJS.Timeout | null = null;
const SUBMIT_TIMEOUT_MS = 30_000; // 30秒制限

function pickRandomTopic() {
  return topics[Math.floor(Math.random() * topics.length)];
}

function startSubmitPhase() {
  hiddenCards = {};
  submittedPlayers.clear(); // 追加：リセット
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
  hiddenCards = {};
  io.emit("cards_update", cards);
  io.emit("submitted_update", Array.from(submittedPlayers)); // 追加：提出済み情報も送る
  io.emit("reveal_cards", cards);  // ここを追加
  console.log("[revealCards] カード公開:", cards);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    players.push({ id: socket.id, name });
    console.log(`[join] ${name} (${socket.id}) が参加`);
    if (players.length === 1) {
      hostId = socket.id;
      currentTopic = pickRandomTopic();
      startSubmitPhase();
      console.log("[join] 最初の参加者、submitフェーズ開始");
    }
    io.emit("players_update", { players, hostId });
    io.emit("topic_update", currentTopic);
    io.emit("cards_update", cards);
    io.emit("submitted_update", Array.from(submittedPlayers)); // 追加
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
      readyPlayers.clear();
      for (const pid in cards) delete cards[pid];
      hiddenCards = {};
      submittedPlayers.clear(); // 追加
      io.emit("players_update", { players, hostId });
      io.emit("topic_update", currentTopic);
      io.emit("cards_update", cards);
      io.emit("submitted_update", Array.from(submittedPlayers)); // 追加
      io.emit("game_restarted");

      startSubmitPhase();
    }
  });

  socket.on("submit_card", (card: string) => {
    hiddenCards[socket.id] = card;
    submittedPlayers.add(socket.id); // 追加
    const submittedCount = submittedPlayers.size;
    console.log(
      `[submit_card] ${socket.id} 提出: ${card}, 提出数: ${submittedCount} / ${players.length}`
    );
    if (submittedCount === players.length) {
      if (submitTimer) clearTimeout(submitTimer);
      revealCards();
    } else {
      io.emit("submitted_update", Array.from(submittedPlayers)); // 途中経過も送る
    }
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);
    delete cards[socket.id];
    delete hiddenCards[socket.id];
    submittedPlayers.delete(socket.id); // 追加
    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
    } else if (players.length === 0) {
      hostId = null;
      currentTopic = null;
      hiddenCards = {};
      submittedPlayers.clear(); // 追加
      if (submitTimer) clearTimeout(submitTimer);
    }
    io.emit("players_update", { players, hostId });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
    io.emit("topic_update", currentTopic);
    io.emit("cards_update", cards);
    io.emit("submitted_update", Array.from(submittedPlayers)); // 追加
  });
});

server.listen(3001, () => {
  console.log("✅ Server listening on port 3001");
});
