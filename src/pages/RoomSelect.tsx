// src/pages/RoomSelect.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../SocketContext";
import { RoomCard } from "../components";

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
  const navigate = useNavigate();

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
      setCurrentRoomId(roomId);
      props.onEnterRoom(roomId);
      navigate("/game");
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

    if (currentRoomId && currentRoomId !== roomId) {
      socket.emit("leave_room", { roomId: currentRoomId });
      setPlayers([]);
      setFiltererId(null);
      setPhase("waiting");
      setIsStarting(false);
      setCurrentRoomId(null);
    }

    setJoiningRoom(true);
    socket.emit("join_room", { name: props.name, roomId });
    setRoomIdInput("");
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
    <div
      style={{
        padding: "2rem",
        color: "#f0f0f0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* ルーム作成 */}
      <h2
        style={{
          fontSize: "2rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#000000ff",
          letterSpacing: "0.5px",
        }}
      >
        ルームを選択または作成
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "2rem",
          gap: "0.5rem",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        <input
          type="text"
          placeholder="ルーム名を入力"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          disabled={joiningRoom}
          style={{
            flexGrow: 1,
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#3b4a5a",
            color: "#fff",
            maxWidth: "360px",
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
            minWidth: "120px",
          }}
        >
          作成
        </button>
      </div>

      {/* 公開ルーム一覧 */}
      <h3
        style={{
          fontSize: "1.8rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#000000ff",
          letterSpacing: "0.5px",
        }}
      >
        公開ルーム一覧
      </h3>

      {availableRooms.length === 0 ? (
        <p>利用可能なルームがありません</p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            maxWidth: "1000px",
            width: "100%",
          }}
        >
          {availableRooms.map(({ roomId, players }) => (
            <RoomCard
              key={roomId}
              roomId={roomId}
              players={players}
              joined={roomId === currentRoomId}
              joiningRoom={joiningRoom}
              isStarting={isStarting}
              onJoin={() => handleJoinRoom(roomId)}
              onStart={handleStartGame}
            />
          ))}
        </div>
      )}
    </div>
  );
}
