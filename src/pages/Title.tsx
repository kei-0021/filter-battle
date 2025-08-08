import { useState } from "react";

export function Title(props: { onJoin: (name: string) => void }) {
  const [inputName, setInputName] = useState("");

  const handleJoinClick = () => {
    if (inputName.trim()) {
      props.onJoin(inputName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJoinClick();
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #283e51 0%, #485563 100%)", // 落ち着いたブルーグレー系
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#f0f0f0",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>Filter Battle</h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "2rem", opacity: 0.85 }}>
        あなたの感性でフィルタラーを見抜け！名前を入力してゲームに参加しよう
      </p>
      <input
        type="text"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="名前を入力"
        style={{
          padding: "0.8rem 1rem",
          fontSize: "1.25rem",
          borderRadius: "8px",
          border: "none",
          outline: "none",
          width: "280px",
          maxWidth: "90vw",
          boxShadow: "0 0 8px rgba(255,255,255,0.3)",
          marginBottom: "1rem",
          backgroundColor: "#3b4a5a",
          color: "#eee",
          transition: "box-shadow 0.3s ease",
        }}
      />
      <button
        onClick={handleJoinClick}
        disabled={!inputName.trim()}
        style={{
          padding: "0.8rem 2rem",
          fontSize: "1.25rem",
          borderRadius: "8px",
          border: "none",
          backgroundColor: inputName.trim() ? "#ff6b6b" : "#999",
          color: "#fff",
          cursor: inputName.trim() ? "pointer" : "not-allowed",
          transition: "background-color 0.3s ease",
          boxShadow: inputName.trim()
            ? "0 4px 10px rgba(255,107,107,0.6)"
            : "none",
        }}
      >
        始める
      </button>
    </div>
  );
}
