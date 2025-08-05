// RoomSelect.tsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function RoomSelect(props: { name: string; onEnterRoom: (roomId: string) => void }) {
  const [roomIdInput, setRoomIdInput] = useState("");
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);

  // RoomSelectでsocket生成
  const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", { withCredentials: true });

  useEffect(() => {
    socket.emit("get_rooms");
    socket.on("rooms_list", (rooms: string[]) => {
      setAvailableRooms(rooms);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    if (!roomId) return;
    props.onEnterRoom(roomId);
  };

  return (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color: "#f0f0f0",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>ルームを選択または作成</h2>

      <div style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="ルーム名を入力"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
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
          onClick={() => handleJoinRoom(roomIdInput.trim())}
          disabled={!roomIdInput.trim()}
          style={{
            padding: "0.6rem 1rem",
            fontSize: "1rem",
            borderRadius: "6px",
            backgroundColor: "#4CAF50",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          作成 / 参加
        </button>
      </div>

      <h3 style={{ marginBottom: "1rem" }}>公開ルーム一覧</h3>
      {availableRooms.length === 0 ? (
        <p>利用可能なルームがありません</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {availableRooms.map((room) => (
            <li key={room} style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => handleJoinRoom(room)}
                style={{
                  padding: "0.6rem 1rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  backgroundColor: "#2196F3",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                参加：{room}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
