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

function pickRandomTopic() {
  return topics[Math.floor(Math.random() * topics.length)];
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    players.push({ id: socket.id, name });
    if (players.length === 1) {
      hostId = socket.id;
      currentTopic = pickRandomTopic();  // 初回ホスト決定時にお題選択
    }
    io.emit("players_update", { players, hostId });
    io.emit("topic_update", currentTopic);
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
      currentTopic = pickRandomTopic();  // 再決定時にお題もランダムで変える
      readyPlayers.clear();
      io.emit("players_update", { players, hostId });
      io.emit("topic_update", currentTopic);
      io.emit("game_restarted");
    }
  });

  socket.on("submit_card", (card: string) => {
    // 必要に応じてカードの保存などの処理を実装
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);
    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
    } else if (players.length === 0) {
      hostId = null;
      currentTopic = null;
    }
    io.emit("players_update", { players, hostId });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
    io.emit("topic_update", currentTopic);
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001");
});
