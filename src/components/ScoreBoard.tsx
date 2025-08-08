// src/components/ScoreBoard.tsx
import { Player } from "../types/gameTypes";

type VotingResults = {
  scores: Record<string, number>;
  voteCounts: Record<string, number>;
  scoreDiffs: Record<string, number>;
};

type ScoreBoardProps = {
  players: Player[];
  myPlayerId: string;
  phase: string;
  votingResults: VotingResults | null;
};

export const ScoreBoard = ({ players, phase, votingResults, myPlayerId }: ScoreBoardProps) => {
  return (
    <div
      style={{
        width: "100%",           
        padding: "1rem 2rem",    
        backgroundColor: "#1e2a38",
        borderRadius: "8px",
        color: "#eee",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>スコア</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {players.map((p) => {
          const isMe = p.id === myPlayerId;
          const score = votingResults?.scores?.[p.id] ?? 0;
          const voteCount = votingResults?.voteCounts?.[p.id] ?? null;
          const scoreDiff = votingResults?.scoreDiffs?.[p.id];

          const diffColor = scoreDiff !== undefined ? (scoreDiff >= 0 ? "#4caf50" : "#e57373") : undefined;
          const diffText =
            scoreDiff !== undefined
              ? scoreDiff >= 0
                ? `+${scoreDiff}`
                : `${scoreDiff}`
              : "";

          return (
            <li
              key={p.id}
              style={{
                backgroundColor: isMe ? "#2196f380" : "#2f3e4e",  // 自分だけ青色
                borderRadius: "6px",
                padding: "0.8rem 1rem",
                marginBottom: "0.6rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "600",
                fontSize: "1rem",
                color: isMe ? "#fff" : "#eee",
              }}
            >
              <span>{p.name}</span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: "700" }}>{score}点</span>
                {phase === "results" && voteCount !== null && (
                  <span style={{ color: "#fff", backgroundColor: "#455a64", borderRadius: "12px", padding: "0.2rem 0.6rem", fontSize: "0.85rem" }}>
                    {voteCount}票
                  </span>
                )}
                {phase === "results" && diffText && (
                  <span style={{ color: diffColor, fontWeight: "700" }}>{diffText}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
