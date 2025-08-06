import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../SocketContext";

type Player = {
  id: string;
  name: string;
};

type RoomSummary = {
  roomId: string;
  players: string[];
};

export function RoomSelect(props: { name: string; onEnterRoom: (roomId: string) => void }) {
  const socket = useSocket();
  const navigate = useNavigate(); // ページ遷移は使わなくてもOK

  const [roomIdInput, setRoomIdInput] = useState("");
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filtererId, setFiltererId] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("waiting");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    socket.emit("get_rooms");

    socket.on("rooms_list", (rooms: RoomSummary[]) => {
      setAvailableRooms(rooms);
    });

    socket.on("join_room_success", (roomId: string) => {
      setJoiningRoom(false);
      setCurrentRoomId(roomId);
    });

    socket.on("join_room_failure", (error: string) => {
      setJoiningRoom(false);
      alert(`ルーム参加失敗: ${error}`);
    });

    socket.on("start_game_success", ({ roomId }: { roomId: string }) => {
        console.log("[DEBUG] start_game_success 受信 → ゲーム画面へ");
        setCurrentRoomId(roomId); // 👈 必ず currentRoomId をセット
        props.onEnterRoom(roomId); // 👈 状態管理にも反映
        navigate("/game"); // 👈 遷移
    });

    socket.on("players_update", ({ players, filtererId }: { players: Player[]; filtererId: string | null }) => {
      setPlayers(players);
      setFiltererId(filtererId);
    });

    socket.on("phase_update", (newPhase: string) => {
      setPhase(newPhase);
      setIsStarting(false);
    });

    return () => {
      socket.off("rooms_list");
      socket.off("join_room_success");
      socket.off("join_room_failure");
      socket.off("start_game_success");
      socket.off("players_update");
      socket.off("phase_update");
    };
  }, [socket]);

  const handleJoinRoom = (roomId: string) => {
    if (!roomId) return;
    setJoiningRoom(true);
    socket.emit("join_room", { name: props.name, roomId });
  };

  const handleStartGame = () => {
    if (!currentRoomId) return;
    console.log("[DEBUG] ゲーム開始要求送信", { roomId: currentRoomId });
    setIsStarting(true);
    socket.emit("start_game", { roomId: currentRoomId });
    props.onEnterRoom(currentRoomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setPlayers([]);
    setFiltererId(null);
    setPhase("waiting");
    setIsStarting(false);
  };

  const isFilterer = filtererId === socket.id;

  return (
    <div style={{ padding: "2rem", color: "#f0f0f0" }}>
      {/* ルーム作成・参加 */}
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ルームを選択または作成</h2>

      <div style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="ルーム名を入力"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          disabled={joiningRoom}
          style={{
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            borderRadius: "6px",
            border: "none",
            marginRight: "0.5rem",
            backgroundColor: "#3b4a5a",
            color: "#fff",
          }}
        />
        <button
          disabled={joiningRoom || !roomIdInput.trim()}
          onClick={() => handleJoinRoom(roomIdInput.trim())}
          style={{
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            borderRadius: "6px",
            backgroundColor: joiningRoom ? "#888" : "#4CAF50",
            color: "#fff",
            border: "none",
            cursor: joiningRoom ? "default" : "pointer",
          }}
        >
          {joiningRoom ? "参加中..." : "作成 / 参加"}
        </button>
      </div>

      {/* 公開ルーム一覧 */}
      <h3 style={{ marginBottom: "1rem" }}>公開ルーム一覧</h3>
      {availableRooms.length === 0 ? (
        <p>利用可能なルームがありません</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
          }}
        >
          {availableRooms.map(({ roomId, players }) => {
            const joined = roomId === currentRoomId;
            return (
              <div
                key={roomId}
                style={{
                  border: "2px solid #ccc",
                  borderRadius: "8px",
                  padding: "1rem",
                  width: "250px",
                  backgroundColor: "#2f3e4e",
                  color: "#fff",
                }}
              >
                <h4 style={{ marginBottom: "0.5rem" }}>ルーム: {roomId}</h4>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: "0.5rem" }}>
                  {players.map((p, idx) => (
                    <li key={idx} style={{ fontSize: "0.9rem" }}>
                      👤 {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    if (joined) {
                      handleStartGame();
                    } else {
                      handleJoinRoom(roomId);
                    }
                  }}
                  disabled={joiningRoom || isStarting}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.9rem",
                    borderRadius: "5px",
                    backgroundColor: joined ? "#4CAF50" : "#2196F3",
                    color: "#fff",
                    border: "none",
                    cursor: joiningRoom || isStarting ? "default" : "pointer",
                    width: "100%",
                  }}
                >
                  {joined ? (isStarting ? "ゲーム開始中..." : "⭐️ゲーム開始") : "参加"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
