import express from "express";
import http from "http";
import { Server } from "socket.io";
import { topics } from "./data/topic";

// お題データをサーバーに直接持たせる例
type Topic = {
  id: number;
  title: string;
  filter: string;
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // 明示的に許可
    credentials: true,
  },
});

type Player = { id: string; name: string };

let players: Player[] = [];
let hostId: string | null = null;
const readyPlayers = new Set<string>();
let currentTopic: Topic | null = null;

// トピックをランダムに切り替える関数
function pickRandomTopic(): Topic {
  const idx = Math.floor(Math.random() * topics.length);
  return topics[idx];
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    players.push({ id: socket.id, name });
    if (players.length === 1) {
      hostId = socket.id;
      // 初回ホスト決定時にお題も決定
      currentTopic = pickRandomTopic();
    }

    io.emit("players_update", { players, hostId, topic: currentTopic });
  });

  socket.on("ready_for_restart", () => {
    readyPlayers.add(socket.id);
    console.log("Ready players IDs:", Array.from(readyPlayers));
    console.log("Ready players count:", readyPlayers.size);

    const readyCount = readyPlayers.size;
    const totalCount = players.length;
    io.emit("ready_status", { readyCount, totalCount });

    if (readyCount === totalCount) {
      console.log("All players ready! Restarting game...");
      // ランダムに親を再決定
      const random = players[Math.floor(Math.random() * players.length)];
      hostId = random.id;
      // お題もランダムで切り替え
      currentTopic = pickRandomTopic();
      readyPlayers.clear();
      io.emit("players_update", { players, hostId, topic: currentTopic });
      io.emit("game_restarted");
    }
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);

    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
      // 親が抜けた場合はお題はそのまま維持してもOK
    } else if (players.length === 0) {
      hostId = null;
      currentTopic = null;
    }

    io.emit("players_update", { players, hostId, topic: currentTopic });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001");
});
