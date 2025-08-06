// src/pages/Game.tsx
import { useEffect, useRef, useState } from "react";
import { PlayerCard, Timer } from "../components/index.js";
import { COMPOSING_TIME_LIMIT } from "../constants.js";
import { useSocket } from "../SocketContext";
import { CardsMap, GamePhase, Player, TopicWithFilters } from "../types/gameTypes.js";

type GameProps = {
  name: string;
  roomId: string;
};

function Game({ name, roomId }: GameProps) {
  const socket = useSocket(); // ここでsocket取得
  
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filtererId, setFiltererId] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [currentTopic, setCurrentTopic] = useState<TopicWithFilters | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string | null>(null);

  const [cards, setCards] = useState<CardsMap>({});
  const [draftCard, setDraftCard] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionAllowed, setSubmissionAllowed] = useState(false);
  const [submittedPlayers, setSubmittedPlayers] = useState<Set<string>>(new Set());
  const [votedPlayerId, setVotedPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("lobby");

  const [timeLeft, setTimeLeft] = useState(COMPOSING_TIME_LIMIT);
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  
  type VotingResults = {
    scores: Record<string, number>;
    voteCounts: Record<string, number>;
    scoreDiffs: Record<string, number>;
  };
  const [votingResults, setVotingResults] = useState<VotingResults | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const submittedRef = useRef(false); // 重複submit防止フラグ
  const draftCardRef = useRef("");

  useEffect(() => {
    if (!roomId) return;
    socket.emit("get_current_state", { roomId });
  }, [roomId]);

  useEffect(() => {
    draftCardRef.current = draftCard;
  }, [draftCard]);

  useEffect(() => {
    socket.on("phase_update", (newPhase: GamePhase) => {
      setPhase(newPhase);
    });

    socket.on("players_update", ({ players, filtererId }: { players: Player[]; filtererId: string | null }) => {
      setPlayers(players);
      setFiltererId(filtererId);
      setPhase((prev) => (prev === "lobby" ? "lobby" : prev)); // lobbyだったら維持
    });

    socket.on("ready_status", ({ readyCount, totalCount }: { readyCount: number; totalCount: number }) => {
      setReadyCount(readyCount);
      setTotalCount(totalCount);
    });

    socket.on("topic_update", (topic: TopicWithFilters | null) => {
      setCurrentTopic(topic);
      setDraftCard("");
      submittedRef.current = false; // submitフラグクリア
      setSubmitted(false);
      setSubmissionAllowed(true);
      setTimeLeft(COMPOSING_TIME_LIMIT);
      setSubmittedPlayers(new Set());
      setVotingResults(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      let time = COMPOSING_TIME_LIMIT;
      timerRef.current = setInterval(() => {
        time -= 1;
        setTimeLeft(time);
        if (time <= 0) {
          setSubmissionAllowed(false);
          setSubmitted(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (!submitted && draftCard.trim()) {
            socket.emit("submit_card", { card: draftCard.trim(), roomId });
          }
        }
      }, 1000);
    });

    socket.on("filter_update", (filter: string | null) => {
      setCurrentFilter(filter);
    });

    socket.on("submitted_update", (submittedIds: string[]) => {
      setSubmittedPlayers(new Set(submittedIds));
    });

    socket.on("cards_update", (newCards: CardsMap) => {
      setCards(newCards);
    });

    socket.on("reveal_cards", (cardsData: CardsMap) => {
      setCards(cardsData);
      setSubmissionAllowed(false);
      setTimeLeft(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPhase("reveal");
      setVotingResults(null);
    });

    socket.on("voting_started", () => {
      setPhase("voting");
      setVotingResults(null);
      setVotedPlayerId(null);
    });

    socket.on("voting_results", ({ scores, voteCounts, scoreDiffs }: VotingResults) => {
      setVotingResults({ scores, voteCounts, scoreDiffs });
      setPhase("results");
    });

    socket.on("game_restarted", () => {
      setSubmitted(false);
      setDraftCard("");
      setSubmissionAllowed(true);
      setTimeLeft(COMPOSING_TIME_LIMIT);
      setSubmittedPlayers(new Set());
      setVotingResults(null);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setSubmissionAllowed(false);
            setSubmitted(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    return () => {
      socket.off("phase_update");
      socket.off("players_update");
      socket.off("ready_status");
      socket.off("topic_update");
      socket.off("filter_update");
      socket.off("submitted_update");
      socket.off("cards_update");
      socket.off("game_restarted");
      socket.off("reveal_cards");
      socket.off("voting_started");
      socket.off("voting_results");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId, socket]);

  const handleStartGame = () => {
    if (!roomId) return;
    socket.emit("start_game", { roomId });
  };

  const handleVote = (playerId: string) => {
    if (phase !== "voting" || !roomId) return;
    socket.emit("vote", { playerId, roomId });
    setVotedPlayerId(playerId);
  };

  const handleRestart = () => {
    if (!roomId) return;
    setPhase("submit");
    socket.emit("ready_for_restart", { roomId });
  };

  const handleSubmitCard = () => {
    if (!draftCard.trim() || !submissionAllowed || !roomId) return;
    socket.emit("submit_card", { card: draftCard.trim(), roomId });
    setSubmitted(true);
    setSubmissionAllowed(false);
  };

  const socketId = socket.id;
  const isFilterer = socketId === filtererId;

  // それ以外はゲーム画面
  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        position: "relative",
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          backgroundColor: "#fff",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <Timer timeLeft={timeLeft} />
        <div
          style={{ marginTop: "0.5rem", fontWeight: "bold", textAlign: "center" }}
        >
          {phase === "submit" && "フェーズ: カード提出"}
          {phase === "reveal" && "フェーズ: カード公開"}
          {phase === "voting" && "フェーズ: 投票受付中"}
          {phase === "results" && "フェーズ: 結果表示"}
        </div>
      </div>

      <h2>お題: {currentTopic ? currentTopic.title : "まだお題がありません"}</h2>

      {isFilterer ? (
        <p style={{ color: "red", fontWeight: "bold", fontSize: "20px" }}>
          あなたがフィルタラーです
          <br />
          <span style={{ fontWeight: "normal", fontSize: "16px", color: "#555" }}>
            フィルター: <strong>{currentFilter || "なし"}</strong> をテーマに書いてください
          </span>
        </p>
      ) : (
        <h3>フィルタラーを当てましょう!</h3>
      )}

      <h2>カードの提出状況</h2>
      {players?.map((p) => {
        const votedByMeFlag =
          (phase === "voting" || phase === "results") && votedPlayerId === p.id;
        return (
          <div key={p.id} style={{ marginBottom: "1rem" }}>
            <div
              onClick={() => {
                if (phase === "voting" && p.id !== socketId) {
                  handleVote(p.id);
                }
              }}
              style={{
                cursor: phase === "voting" && p.id !== socketId ? "pointer" : "default",
              }}
            >
              <PlayerCard
                name={p.name}
                card={cards[p.id] || ""}
                editable={p.id === socketId && !submitted && submissionAllowed}
                isMe={p.id === socketId}
                draftCard={p.id === socketId ? draftCard : undefined}
                setDraftCard={
                  p.id === socketId && !submitted && submissionAllowed
                    ? setDraftCard
                    : undefined
                }
                onSubmitCard={
                  p.id === socketId && !submitted && submissionAllowed
                    ? handleSubmitCard
                    : undefined
                }
                submissionAllowed={submissionAllowed}
                hasSubmitted={submittedPlayers.has(p.id)}
                onVote={
                  phase === "voting" && p.id !== socketId
                    ? () => handleVote(p.id)
                    : undefined
                }
                voted={p.id === votedPlayerId}
                votedByMe={votedByMeFlag}
                votedByOthers={
                  phase === "results" && votingResults
                    ? (votingResults.voteCounts[p.id] ?? 0) -
                      (votedPlayerId === p.id ? 1 : 0)
                    : 0
                }
                isFilterer={phase === "results" && p.id === filtererId}
              />
            </div>
          </div>
        );
      })}

      {phase === "reveal" && (
        <button
          onClick={() => socket.emit("start_voting", { roomId })}
          style={{
            marginTop: "1rem",
            padding: "0.6rem 1.2rem",
            fontSize: "1rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          投票に移る
        </button>
      )}

      {phase === "results" && votingResults && (
        <>
          <h2>投票結果</h2>
          <ul>
            {players.map((p) => (
              <li key={p.id}>
                {p.name}: {votingResults.voteCounts[p.id] ?? 0}票 / スコア:{" "}
                {votingResults.scores[p.id] ?? 0}（
                {votingResults.scoreDiffs[p.id] > 0
                  ? `+${votingResults.scoreDiffs[p.id]}`
                  : votingResults.scoreDiffs[p.id] ?? 0}
                ）
              </li>
            ))}
          </ul>
        </>
      )}

      <div
        style={{
          paddingTop: "2rem",
          borderTop: "1px solid #ccc",
          marginBottom: "2rem",
        }}
      >
        <button onClick={handleRestart} style={{ padding: "0.5rem 1rem" }}>
          もう一度遊ぶ (全員準備完了で再スタート)
        </button>
        <p style={{ marginTop: "0.5rem" }}>
          {readyCount} / {totalCount}人が準備済みです
        </p>
      </div>
    </div>
  );
}

export default Game;
