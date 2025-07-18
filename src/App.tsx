import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type Player = { id: string; name: string };
type Topic = {
  id: number;
  title: string;
  filter: string;
};

const socket = io("http://localhost:3001", { withCredentials: true });

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [joined, setJoined] = useState(false);
  const [socketId, setSocketId] = useState<string>("");
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [gameRestarted, setGameRestarted] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setSocketId(socket.id ?? "");
      console.log("Connected with socket.id:", socket.id);
    };

    const onPlayersUpdate = (data: {
      players: Player[];
      hostId: string | null;
      topic: Topic | null;
    }) => {
      setPlayers(data.players);
      setHostId(data.hostId);
      setTopic(data.topic);
      setGameRestarted(false);
      setReadyCount(0);
      setTotalCount(data.players.length);
      console.log("Players updated:", data.players, "Host:", data.hostId, "Topic:", data.topic);
    };

    const onReadyStatus = ({ readyCount, totalCount }: { readyCount: number; totalCount: number }) => {
      setReadyCount(readyCount);
      setTotalCount(totalCount);
      console.log(`Ready status: ${readyCount}/${totalCount}`);
    };

    const onGameRestarted = () => {
      setGameRestarted(true);
      setReadyCount(0);
      console.log("Game restarted!");
    };

    socket.on("connect", onConnect);
    socket.on("players_update", onPlayersUpdate);
    socket.on("ready_status", onReadyStatus);
    socket.on("game_restarted", onGameRestarted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("players_update", onPlayersUpdate);
      socket.off("ready_status", onReadyStatus);
      socket.off("game_restarted", onGameRestarted);
    };
  }, []);

  const handleJoin = () => {
    socket.emit("join", myName || "ななし");
    setJoined(true);
  };

  const handleReady = () => {
    socket.emit("ready_for_restart");
  };

  const isHost = socketId === hostId;

  return (
    <div>
      {!joined ? (
        <>
          <input
            placeholder="名前を入力"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
          />
          <button onClick={handleJoin}>参加</button>
        </>
      ) : (
        <>
          <h2>プレイヤー一覧</h2>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.name}
                {p.id === hostId && " 👑"}
              </li>
            ))}
          </ul>

          <p>{isHost ? "あなたが親です" : "あなたは子です"}</p>

          <h3>お題: {topic ? topic.title : "まだありません"}</h3>

          <button onClick={handleReady}>もう一回遊ぶ（親再決定）</button>

          <p>
            {readyCount}人が準備済み、{totalCount - readyCount}人待ちです
          </p>

          {gameRestarted && <p>ゲームが再開されました！</p>}
        </>
      )}
    </div>
  );
}
