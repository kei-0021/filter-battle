// src/components/RoomCard.tsx
type RoomCardProps = {
  roomId: string;
  players: string[];
  joined: boolean;
  joiningRoom: boolean;
  isStarting: boolean;
  onJoin: () => void;
  onStart: () => void;
};

export function RoomCard({
  roomId,
  players,
  joined,
  joiningRoom,
  isStarting,
  onJoin,
  onStart,
}: RoomCardProps) {
  return (
    <div
      style={{
        border: "2px solid #ccc",
        borderRadius: "10px",
        padding: "1.5rem",
        width: "600px",
        backgroundColor: "#2f3e4e",
        color: "#fff",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)", // 影を追加
        display: "flex",
        flexDirection: "column",
        gap: "1rem", // 内部要素の間隔を広げる
      }}
    >
      <h4
        style={{
          marginTop: "0.5rem",  // これで上余白を小さく
          marginBottom: "0.5rem",
          textAlign: "center",
          fontWeight: "600",
          fontSize: "1.6rem",
        }}
      >
        ルーム: {roomId}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "150px", overflowY: "auto" }}>
        {players.map((p, idx) => (
          <li
            key={idx}
            style={{
              fontSize: "1.2rem",          // ここを大きく
              lineHeight: "1.6",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",              // アイコンとテキストの間も少し広げる
              padding: "4px 0",            // 行の高さも少し増やす
            }}
          >
            <span style={{ width: "1.6rem", textAlign: "center", fontSize: "1.4rem" }}>👤</span> {/* 絵文字も大きく */}
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={joined ? onStart : onJoin}
        disabled={joiningRoom || isStarting}
        style={{
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          borderRadius: "6px",
          backgroundColor: joined ? "#4CAF50" : "#2196F3",
          color: "#fff",
          border: "none",
          cursor: joiningRoom || isStarting ? "default" : "pointer",
          width: "100%",
          transition: "background-color 0.3s ease",
          userSelect: "none",
        }}
        onMouseEnter={e => {
          if (!joiningRoom && !isStarting) {
            e.currentTarget.style.backgroundColor = joined ? "#45a049" : "#1e88e5";
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = joined ? "#4CAF50" : "#2196F3";
        }}
        onMouseDown={e => {
          if (!joiningRoom && !isStarting) {
            e.currentTarget.style.backgroundColor = joined ? "#3e8e41" : "#1565c0";
          }
        }}
        onMouseUp={e => {
          if (!joiningRoom && !isStarting) {
            e.currentTarget.style.backgroundColor = joined ? "#45a049" : "#1e88e5";
          }
        }}
      >
        {joined ? (isStarting ? "ゲーム開始中..." : "⭐️ゲーム開始") : "参加"}
      </button>
    </div>
  );
}
