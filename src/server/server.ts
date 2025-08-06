// src/server/server.tsx
import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { COMPOSING_TIME_LIMIT, USE_INDEPENDENT_TOPIC_AND_FILTERS } from "../constants.js";
import filters from "../data/filters.json" with { type: "json" };
import topics from "../data/topics.json" with { type: "json" };
import { GameState, TopicWithFilters } from "../types/gameTypes.js";
import { calculateScores } from "./calculateScores.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../../dist");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://filter-battle.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.static(distPath));
app.get("*", (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const gameStates = new Map<string, GameState>();

function createInitialGameState(): GameState {
  return {
    players: [],
    readyPlayers: new Set(),
    currentTopic: null,
    currentFilter: null,
    filtererId: null,
    phase: "Submit",
    cards: {},
    hiddenCards: {},
    submittedPlayers: new Set(),
    submitTimer: null,
    votes: {},
    scores: {},
  };
}

function pickRandomPlayer(state: GameState): string | null {
  if (state.players.length === 0) return null;
  const idx = Math.floor(Math.random() * state.players.length);
  return state.players[idx].id;
}

function pickRandomTopic(): TopicWithFilters | null {
  if (!topics.length) return null;
  const idx = Math.floor(Math.random() * topics.length);
  return topics[idx];
}

function pickRandomFilterByTopic(topic: TopicWithFilters | null): string | null {
  if (!topic || !topic.filters.length) return null;
  const idx = Math.floor(Math.random() * topic.filters.length);
  return topic.filters[idx];
}

function pickRandomFilterWord(): string | null {
  if (!filters.length) return null;
  const idx = Math.floor(Math.random() * filters.length);
  return filters[idx].filter;
}

function updatePhase(state: GameState, roomId: string, newPhase: GameState["phase"]) {
  state.phase = newPhase;
  io.to(roomId).emit("phase_update", state.phase);
  console.log(`[PhaseUpdate] ${newPhase} 開始 (room: ${roomId})`);
}

function startSubmitPhase(state: GameState, roomId: string) {
  updatePhase(state, roomId, "Submit");
  state.hiddenCards = {};
  state.submittedPlayers.clear();
  if (state.submitTimer) {
    clearTimeout(state.submitTimer);
  }
  state.submitTimer = setTimeout(() => {
    console.log(`[Timer] Submitフェーズタイマー終了、カード公開へ移行 (room: ${roomId})`);
    revealCards(state, roomId);
  }, COMPOSING_TIME_LIMIT * 1000);
}

function revealCards(state: GameState, roomId: string) {
  updatePhase(state, roomId, "Reveal");
  Object.assign(state.cards, state.hiddenCards);
  const revealed = { ...state.cards };
  state.hiddenCards = {};
  io.to(roomId).emit("cards_update", revealed);
  io.to(roomId).emit("submitted_update", Array.from(state.submittedPlayers));
  io.to(roomId).emit("reveal_cards", revealed);
  console.log(`[revealCards] カード公開 (room: ${roomId}):`, revealed);
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("get_rooms", () => {
    const roomSummaries = Array.from(gameStates.entries()).map(([roomId, state]) => ({
      roomId,
      players: state.players.map(p => p.name),
    }));
    socket.emit("rooms_list", roomSummaries);
  });

  socket.on("join_room", ({ roomId, name }: { roomId: string; name: string }) => {
    socket.join(roomId);
    if (!gameStates.has(roomId)) {
      gameStates.set(roomId, createInitialGameState());
    }
    const state = gameStates.get(roomId)!;

    if (!state.players.find((p) => p.id === socket.id)) {
      state.players.push({ id: socket.id, name });
    }

    console.log(`[join_room] ${name} がルーム ${roomId} に参加`);

    if (state.players.length === 1) {
      state.filtererId = socket.id;
      if (USE_INDEPENDENT_TOPIC_AND_FILTERS) {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterWord();
      } else {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterByTopic(state.currentTopic);
      }
    }

    io.to(roomId).emit("players_update", { players: state.players, filtererId: state.filtererId });
    io.to(roomId).emit("topic_update", state.currentTopic);
    io.to(roomId).emit("filter_update", state.currentFilter);
    io.to(roomId).emit("cards_update", state.cards);
    io.to(roomId).emit("submitted_update", Array.from(state.submittedPlayers));
    io.to(roomId).emit("phase_update", state.phase);

    const roomSummaries = Array.from(gameStates.entries()).map(([roomId, state]) => ({
      roomId,
      players: state.players.map(p => p.name),
    }));
    io.emit("rooms_list", roomSummaries);

    // ここを追加：join_room成功通知
    socket.emit("join_room_success", roomId);
  });

  socket.on("start_game", ({ roomId }) => {
    const state = gameStates.get(roomId);
    if (!state) return;

    if (!state.currentTopic) {
      if (USE_INDEPENDENT_TOPIC_AND_FILTERS) {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterWord();
      } else {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterByTopic(state.currentTopic);
      }
    }

    state.readyPlayers.clear();
    state.votes = {};
    state.cards = {};
    state.hiddenCards = {};
    state.submittedPlayers.clear();

    startSubmitPhase(state, roomId);
    io.to(roomId).emit("start_game_success", { roomId });

    io.to(roomId).emit("topic_update", state.currentTopic);
    io.to(roomId).emit("filter_update", state.currentFilter);
  });

  socket.on("get_current_state", ({ roomId }) => {
    const state = gameStates.get(roomId);
    if (!state) return;

    socket.emit("phase_update", state.phase);
    socket.emit("topic_update", state.currentTopic);
    socket.emit("filter_update", state.currentFilter);
    socket.emit("cards_update", state.cards);
    socket.emit("submitted_update", Array.from(state.submittedPlayers));
    socket.emit("players_update", { players: state.players, filtererId: state.filtererId });
  });

  socket.on("ready_for_restart", ({ roomId }: { roomId: string }) => {
    const state = gameStates.get(roomId);
    if (!state) return;

    state.readyPlayers.add(socket.id);
    const readyCount = state.readyPlayers.size;
    const totalCount = state.players.length;
    io.to(roomId).emit("ready_status", { readyCount, totalCount });

    if (readyCount === totalCount) {
      state.filtererId = pickRandomPlayer(state);
      console.log(`[ready_for_restart] 全員準備完了、フィルタラー: ${state.filtererId} (room: ${roomId})`);

      if (USE_INDEPENDENT_TOPIC_AND_FILTERS) {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterWord();
      } else {
        state.currentTopic = pickRandomTopic();
        state.currentFilter = pickRandomFilterByTopic(state.currentTopic);
      }

      state.readyPlayers.clear();
      state.cards = {};
      state.hiddenCards = {};
      state.submittedPlayers.clear();
      state.votes = {};
      updatePhase(state, roomId, "Submit");

      io.to(roomId).emit("players_update", { players: state.players, filtererId: state.filtererId });
      io.to(roomId).emit("topic_update", state.currentTopic);
      io.to(roomId).emit("filter_update", state.currentFilter);
      io.to(roomId).emit("cards_update", state.cards);
      io.to(roomId).emit("submitted_update", Array.from(state.submittedPlayers));
      io.to(roomId).emit("phase_update", state.phase);

      startSubmitPhase(state, roomId);
    }
  });

  socket.on("submit_card", ({ roomId, card }: { roomId: string; card: string }) => {
    const state = gameStates.get(roomId);
    if (!state) return;
    if (state.phase !== "Submit") {
      console.log("[submit_card] Submitフェーズ以外のカード提出は無視");
      return;
    }

    state.hiddenCards[socket.id] = card;
    state.submittedPlayers.add(socket.id);
    const submittedCount = state.submittedPlayers.size;
    console.log(`[submit_card] ${socket.id} 提出: ${card}, 提出数: ${submittedCount} / ${state.players.length} (room: ${roomId})`);

    if (submittedCount === state.players.length) {
      if (state.submitTimer) clearTimeout(state.submitTimer);
      revealCards(state, roomId);
    } else {
      io.to(roomId).emit("submitted_update", Array.from(state.submittedPlayers));
    }
  });

  socket.on("start_voting", ({ roomId }: { roomId: string }) => {
    const state = gameStates.get(roomId);
    if (!state) return;
    if (state.phase !== "Reveal") {
      console.log("[start_voting] 投票開始はRevealフェーズのみ有効");
      return;
    }
    updatePhase(state, roomId, "Voting");
    io.to(roomId).emit("voting_started");
  });

  socket.on("vote", ({ roomId, playerId }: { roomId: string; playerId: string }) => {
    const state = gameStates.get(roomId);
    if (!state) return;
    if (state.phase !== "Voting") {
      console.log("[vote] Votingフェーズ以外の投票は無視");
      return;
    }
    if (!state.players.find((p) => p.id === playerId)) {
      console.log("[vote] 無効な投票先:", playerId);
      return;
    }

    state.votes[socket.id] = playerId;
    console.log(`[vote] ${socket.id} が ${playerId} に投票 (room: ${roomId})`);

    if (Object.keys(state.votes).length === state.players.length) {
      console.log("[vote] 全員投票完了 集計開始");

      const voteCounts: Record<string, number> = {};
      Object.values(state.votes).forEach((votedId) => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
      });

      const currentScores = calculateScores(state);

      const scoreDiffs: Record<string, number> = {};
      for (const playerId in currentScores) {
        const prevScore = state.scores[playerId] || 0;
        scoreDiffs[playerId] = currentScores[playerId];
        state.scores[playerId] = prevScore + currentScores[playerId];
      }

      console.log("[vote] 投票結果:", state.scores, voteCounts);

      io.to(roomId).emit("voting_results", {
        scores: state.scores,
        voteCounts,
        scoreDiffs,
      });

      updatePhase(state, roomId, "results");

      state.votes = {};
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    for (const [roomId, state] of gameStates.entries()) {
      const prevLength = state.players.length;
      state.players = state.players.filter((p) => p.id !== socket.id);
      if (prevLength !== state.players.length) {
        state.readyPlayers.delete(socket.id);
        delete state.cards[socket.id];
        delete state.hiddenCards[socket.id];
        state.submittedPlayers.delete(socket.id);
        delete state.votes[socket.id];

        if (socket.id === state.filtererId) {
          if (state.players.length > 0) {
            state.filtererId = state.players[0].id;
          } else {
            state.filtererId = null;
            state.currentTopic = null;
            state.currentFilter = null;
            state.hiddenCards = {};
            state.submittedPlayers.clear();
            updatePhase(state, roomId, "Submit");
            if (state.submitTimer) clearTimeout(state.submitTimer);
          }
        }

        io.to(roomId).emit("players_update", { players: state.players, filtererId: state.filtererId });
        io.to(roomId).emit("ready_status", { readyCount: state.readyPlayers.size, totalCount: state.players.length });
        io.to(roomId).emit("topic_update", state.currentTopic);
        io.to(roomId).emit("filter_update", state.currentFilter);
        io.to(roomId).emit("cards_update", state.cards);
        io.to(roomId).emit("submitted_update", Array.from(state.submittedPlayers));
        io.to(roomId).emit("phase_update", state.phase);
      }

      if (state.players.length === 0) {
        gameStates.delete(roomId);
        console.log(`[Room Cleanup] ルーム「${roomId}」を削除`);
      }
    }
  });
});
