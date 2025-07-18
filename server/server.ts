import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ワイルドカードではなく明示的に指定
    credentials: true,               // withCredentials対応のためにcredentials:trueを入れる
  },
});

type Player = { id: string; name: string };

let players: Player[] = [];
let hostId: string | null = null;
const readyPlayers = new Set<string>();

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", (name: string) => {
    players.push({ id: socket.id, name });
    if (players.length === 1) hostId = socket.id;
    io.emit("players_update", { players, hostId });
  });

  socket.on("ready_for_restart", () => {
    readyPlayers.add(socket.id);
    console.log("Ready players IDs:", Array.from(readyPlayers));
    console.log("Ready players count:", readyPlayers.size);

    const readyCount = readyPlayers.size;
    const totalCount = players.length;
    io.emit("ready_status", { readyCount, totalCount });

    // サーバー側のsocket.io処理の中に追加（readyが全員揃ったあと）
    if (readyCount === totalCount) {
      console.log("All players ready! Restarting game...");
      const random = players[Math.floor(Math.random() * players.length)];
      hostId = random.id;
      readyPlayers.clear();

      const theme = getRandomTheme(); // ← お題を選ぶ関数を使う

      io.emit("players_update", { players, hostId });
      io.emit("game_restarted");
      io.emit("new_theme", theme); // ← ここで全員にお題を送信
    }

    // 補助関数：お題をランダムに選ぶ
    function getRandomTheme() {
      const themes = ["ラーメン", "未来の乗り物", "休日の過ごし方", "変な発明", "学校であった怖い話"];
      return themes[Math.floor(Math.random() * themes.length)];
    }
  });

  socket.on("disconnect", () => {
    players = players.filter((p) => p.id !== socket.id);
    readyPlayers.delete(socket.id);

    if (socket.id === hostId && players.length > 0) {
      hostId = players[0].id;
    } else if (players.length === 0) {
      hostId = null;
    }

    io.emit("players_update", { players, hostId });
    io.emit("ready_status", { readyCount: readyPlayers.size, totalCount: players.length });
  });
});

server.listen(3001, () => {
  console.log("Server listening on port 3001");
});
