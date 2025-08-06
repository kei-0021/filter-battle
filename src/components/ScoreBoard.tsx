// src/components/ScoreBoard.tsx
import { Player } from "../types/gameTypes";

type VotingResults = {
  scores: Record<string, number>;
  voteCounts: Record<string, number>;
  scoreDiffs: Record<string, number>;
};

type ScoreBoardProps = {
  players: Player[];
  phase: string;
  votingResults: VotingResults | null;
};

export const ScoreBoard = ({ players, phase, votingResults }: ScoreBoardProps) => {
  return (
    <div>
      <h2>スコア</h2>
      <ul>
        {players.map((p) => {
          const score = votingResults?.scores?.[p.id] ?? 0;
          const voteCount = votingResults?.voteCounts?.[p.id] ?? null;
          const scoreDiff = votingResults?.scoreDiffs?.[p.id];

          const diffText =
            scoreDiff !== undefined
              ? scoreDiff >= 0
                ? `+${scoreDiff}`
                : `${scoreDiff}`
              : "";

          return (
            <li key={p.id}>
              {p.name}: スコア {score}
              {phase === "results" && voteCount !== null && (
                <>（{voteCount}票 / {diffText}）</>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
