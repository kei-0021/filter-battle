import express from "express";
import http from "http";
import { Server } from "socket.io";
import { topics, type TopicWithFilters } from "../../data/topic";
import { CardsMap, GamePhase, Player } from "../shared/types";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

let players: Player[] = [];
let hostId: string | null = null;
const readyPlayers = new Set<string>();
let currentTopic: TopicWithFilters | null = null;
let currentFilter: string | null = null;
const cards: CardsMap = {};
let hiddenCards: CardsMap = {};
const submittedPlayers = new Set<string>();
let submitTimer: NodeJS.Timeout | null = null;
const SUBMIT_TIMEOUT_MS = 30_000;

let phase: GamePhase = "submit";

// 投票管理 playerId（投票者） -> playerId（投票先）
const votes: Record<string, string> = {};

function pickRandomTopic() {
  return topics[Math.floor(Math.random() * topics.length)];
}

function pickRandomFilter(topic: TopicWithFilters | null) {
  if (!topic || topic.filters.length === 0) return null;
  const idx = Math.floor(Math.random() * topic.filters.length);
  return topic.filters[idx];
}

function startSubmitPhase() {
  phase = "submit";
  console.log(`[Phase] submitフェーズ開始`);
  hiddenCards = {};
  submittedPlayers.clear();
  if (submitTimer) {
    clearTimeout(submitTimer);
  }
  submitTimer = setTimeout(() => {
    console.log(`[Phase] submitフェーズタイマー終了、カード公開へ移行`);
    revealCards();
  }, SUBMIT_TIMEOUT_MS);
  io.emit("phase_update", phase);
}

function revealCards() {
  phase = "reveal";
  console.log(`[Phase] revealフェーズ開始`);
  Object.assign(cards, hiddenCards);
  const revealed = { ...cards };
  hiddenCards = {};
  io.emit("cards_update", revealed);
  io.emit("submitted_update", Array.from(submittedPlayers));
  io.emit("reveal_cards", revealed);
  io.emit("phase_update", phase);
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
    io.emit("phase_update", phase);
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
      phase = "submit";
      io.emit("players_update", { players, hostId });
      io.emit("topic_update", currentTopic);
      io.emit("filter_update", currentFilter);
      io.emit("cards_update", cards);
      io.emit("submitted_update", Array.from(submittedPlayers));
      io.emit("game_restarted");
      io.emit("phase_update", phase);
      startSubmitPhase();
    }
  });

  socket.on("submit_card", (card: string) => {
    if (phase !== "submit") {
      console.log("[submit_card] submitフェーズ以外のカード提出は無視");
      return;
    }
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

  socket.on("start_voting", () => {
    if (phase !== "reveal") {
      console.log("[start_voting] 投票開始はrevealフェーズのみ有効");
      return;
    }
    phase = "voting";
    console.log("[Phase] votingフェーズ開始");
    io.emit("voting_started");
  });

  socket.on("vote", (playerId: string) => {
    if (phase !== "voting") {
      console.log("[vote] votingフェーズ以外の投票は無視");
      return;
    }
    if (!players.find((p) => p.id === playerId)) {
      console.log("[vote] 無効な投票先:", playerId);
      return;
    }
    votes[socket.id] = playerId;
    console.log(`[vote] ${socket.id} が ${playerId} に投票`);

    if (Object.keys(votes).length === players.length) {
      console.log("[vote] 全員投票完了 集計開始");
      const results: Record<string, number> = {};
      Object.values(votes).forEach((votedId) => {
        results[votedId] = (results[votedId] || 0) + 1;
      });

      console.log("[vote] 投票結果:", results);

      io.emit("voting_results", results);

      phase = "results";
      io.emit("phase_update", phase);

      // 投票情報クリア
      for (const key in votes) delete votes[key];
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);
    delete cards[socket.id];
    delete hiddenCards[socket.id];
    submittedPlayers.delete(socket.id);
    delete votes[socket.id];
    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
    } else if (players.length === 0) {
      hostId = null;
      currentTopic = null;
      currentFilter = null;
      hiddenCards = {};
      submittedPlayers.clear();
      phase = "submit";
      if (submitTimer) clearTimeout(submitTimer);
    }
    io.emit("players_update", { players, hostId });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
    io.emit("topic_update", currentTopic);
    io.emit("filter_update", currentFilter);
    io.emit("cards_update", cards);
    io.emit("submitted_update", Array.from(submittedPlayers));
    io.emit("phase_update", phase);
  });
});

server.listen(3001, () => {
  console.log("✅ Server listening on port 3001");
});
