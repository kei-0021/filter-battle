import express from "express";
import http from "http";
import { Server } from "socket.io";
import { topics } from "../../data/topic";
import { GameState, Player, TopicWithFilters } from "../shared/types";
import { calculateScores } from "./calculateScores";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const SUBMIT_TIMEOUT_MS = 30_000;

const gameState: GameState = {
  players: [],
  readyPlayers: new Set<string>(),
  currentTopic: null,
  currentFilter: null,
  filtererId: null,
  phase: "submit",
  cards: {},
  hiddenCards: {},
  submittedPlayers: new Set<string>(),
  submitTimer: null,
  votes: {},
  scores: {},
};

function pickRandomTopic(): TopicWithFilters | null {
  if (!topics.length) return null;
  const idx = Math.floor(Math.random() * topics.length);
  return topics[idx];
}

function pickRandomFilter(topic: TopicWithFilters | null): string | null {
  if (!topic || !topic.filters.length) return null;
  const idx = Math.floor(Math.random() * topic.filters.length);
  return topic.filters[idx];
}

function startSubmitPhase() {
  gameState.phase = "submit";
  console.log(`[Phase] submitフェーズ開始`);
  gameState.hiddenCards = {};
  gameState.submittedPlayers.clear();
  if (gameState.submitTimer) {
    clearTimeout(gameState.submitTimer);
  }
  gameState.submitTimer = setTimeout(() => {
    console.log(`[Phase] submitフェーズタイマー終了、カード公開へ移行`);
    revealCards();
  }, SUBMIT_TIMEOUT_MS);
  io.emit("phase_update", gameState.phase);
}

function revealCards() {
  gameState.phase = "reveal";
  console.log(`[Phase] revealフェーズ開始`);
  Object.assign(gameState.cards, gameState.hiddenCards);
  const revealed = { ...gameState.cards };
  gameState.hiddenCards = {};
  io.emit("cards_update", revealed);
  io.emit("submitted_update", Array.from(gameState.submittedPlayers));
  io.emit("reveal_cards", revealed);
  io.emit("phase_update", gameState.phase);
  console.log("[revealCards] カード公開:", revealed);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    const newPlayer: Player = { id: socket.id, name };
    gameState.players.push(newPlayer);
    console.log(`[join] ${name} (${socket.id}) が参加`);

    if (gameState.players.length === 1) {
      gameState.filtererId = socket.id;
      gameState.currentTopic = pickRandomTopic();
      gameState.currentFilter = pickRandomFilter(gameState.currentTopic);
      startSubmitPhase();
      console.log("[join] 最初の参加者、submitフェーズ開始");
    }

    io.emit("players_update", { players: gameState.players, filtererId: gameState.filtererId });
    io.emit("topic_update", gameState.currentTopic);
    io.emit("filter_update", gameState.currentFilter);
    io.emit("cards_update", gameState.cards);
    io.emit("submitted_update", Array.from(gameState.submittedPlayers));
    io.emit("phase_update", gameState.phase);
  });

  socket.on("ready_for_restart", () => {
    gameState.readyPlayers.add(socket.id);
    const readyCount = gameState.readyPlayers.size;
    const totalCount = gameState.players.length;
    io.emit("ready_status", { readyCount, totalCount });

    if (readyCount === totalCount) {
      console.log("All players ready! Restarting game...");
      const randomPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)];
      gameState.filtererId = randomPlayer.id;
      gameState.currentTopic = pickRandomTopic();
      gameState.currentFilter = pickRandomFilter(gameState.currentTopic);
      gameState.readyPlayers.clear();
      gameState.cards = {};
      gameState.hiddenCards = {};
      gameState.submittedPlayers.clear();
      gameState.phase = "submit";

      io.emit("players_update", { players: gameState.players, filtererId: gameState.filtererId });
      io.emit("topic_update", gameState.currentTopic);
      io.emit("filter_update", gameState.currentFilter);
      io.emit("cards_update", gameState.cards);
      io.emit("submitted_update", Array.from(gameState.submittedPlayers));
      io.emit("game_restarted");
      io.emit("phase_update", gameState.phase);

      startSubmitPhase();
    }
  });

  socket.on("submit_card", (card: string) => {
    if (gameState.phase !== "submit") {
      console.log("[submit_card] submitフェーズ以外のカード提出は無視");
      return;
    }
    gameState.hiddenCards[socket.id] = card;
    gameState.submittedPlayers.add(socket.id);
    const submittedCount = gameState.submittedPlayers.size;
    console.log(`[submit_card] ${socket.id} 提出: ${card}, 提出数: ${submittedCount} / ${gameState.players.length}`);

    if (submittedCount === gameState.players.length) {
      if (gameState.submitTimer) clearTimeout(gameState.submitTimer);
      revealCards();
    } else {
      io.emit("submitted_update", Array.from(gameState.submittedPlayers));
    }
  });

  socket.on("start_voting", () => {
    if (gameState.phase !== "reveal") {
      console.log("[start_voting] 投票開始はrevealフェーズのみ有効");
      return;
    }
    gameState.phase = "voting";
    console.log("[Phase] votingフェーズ開始");
    io.emit("voting_started");
  });

  socket.on("vote", (playerId: string) => {
    if (gameState.phase !== "voting") {
      console.log("[vote] votingフェーズ以外の投票は無視");
      return;
    }
    if (!gameState.players.find((p) => p.id === playerId)) {
      console.log("[vote] 無効な投票先:", playerId);
      return;
    }
    gameState.votes[socket.id] = playerId;
    console.log(`[vote] ${socket.id} が ${playerId} に投票`);

    if (Object.keys(gameState.votes).length === gameState.players.length) {
      console.log("[vote] 全員投票完了 集計開始");

      const voteCounts: Record<string, number> = {};
      Object.values(gameState.votes).forEach((votedId) => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      });

      // 今回のスコアを計算（calculateScoresが今回スコアを返す想定）
      const currentScores = calculateScores(gameState);

      // 累積スコアに足し合わせる
      const scoreDiffs: Record<string, number> = {};
      for (const playerId in currentScores) {
        const prevScore = gameState.scores[playerId] || 0;
        scoreDiffs[playerId] = currentScores[playerId];
        gameState.scores[playerId] = prevScore + currentScores[playerId];
      }

      console.log("[vote] 投票結果:", gameState.scores, voteCounts);

      io.emit("voting_results", {
        scores: gameState.scores,
        voteCounts,
        scoreDiffs,
      });

      gameState.phase = "results";
      io.emit("phase_update", gameState.phase);

      gameState.votes = {};
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    gameState.players = gameState.players.filter((p) => p.id !== socket.id);
    gameState.readyPlayers.delete(socket.id);
    delete gameState.cards[socket.id];
    delete gameState.hiddenCards[socket.id];
    gameState.submittedPlayers.delete(socket.id);
    delete gameState.votes[socket.id];

    if (socket.id === gameState.filtererId) {
      if (gameState.players.length > 0) {
        gameState.filtererId = gameState.players[0].id;
      } else {
        gameState.filtererId = null;
        gameState.currentTopic = null;
        gameState.currentFilter = null;
        gameState.hiddenCards = {};
        gameState.submittedPlayers.clear();
        gameState.phase = "submit";
        if (gameState.submitTimer) clearTimeout(gameState.submitTimer);
      }
    }

    io.emit("players_update", { players: gameState.players, filtererId: gameState.filtererId });
    io.emit("ready_status", { readyCount: gameState.readyPlayers.size, totalCount: gameState.players.length });
    io.emit("topic_update", gameState.currentTopic);
    io.emit("filter_update", gameState.currentFilter);
    io.emit("cards_update", gameState.cards);
    io.emit("submitted_update", Array.from(gameState.submittedPlayers));
    io.emit("phase_update", gameState.phase);
  });
});

server.listen(3001, () => {
  console.log("✅ Server listening on port 3001");
});
