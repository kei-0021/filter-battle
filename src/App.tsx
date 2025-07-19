import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { PlayerCard } from "./components/PlayerCard";
import { Timer } from "./components/Timer";
import { Title } from "./pages/Title";
import { CardsMap, Phase, Player, TopicWithFilters } from "./shared/types";

const socket = io("http://localhost:3001");
const TIMER = 30;

function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [currentTopic, setCurrentTopic] = useState<TopicWithFilters | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string | null>(null);

  const [cards, setCards] = useState<CardsMap>({});
  const [draftCard, setDraftCard] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionAllowed, setSubmissionAllowed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [submittedPlayers, setSubmittedPlayers] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [phase, setPhase] = useState<Phase>("submit");

  useEffect(() => {
    socket.on(
      "players_update",
      ({ players, hostId }: { players: Player[]; hostId: string | null }) => {
        setPlayers(players);
        setHostId(hostId);
      }
    );

    socket.on(
      "ready_status",
      ({ readyCount, totalCount }: { readyCount: number; totalCount: number }) => {
        setReadyCount(readyCount);
        setTotalCount(totalCount);
      }
    );

    socket.on("topic_update", (topic: TopicWithFilters | null) => {
      setCurrentTopic(topic);
      setDraftCard("");
      setSubmitted(false);
      setSubmissionAllowed(true);
      setTimeLeft(TIMER);
      setSubmittedPlayers(new Set());
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
    });

    socket.on("voting_started", () => {
      setPhase("voting");
    });

    socket.on("game_restarted", () => {
      setSubmitted(false);
      setDraftCard("");
      setSubmissionAllowed(true);
      setTimeLeft(TIMER);
      setSubmittedPlayers(new Set());
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
      socket.off("players_update");
      socket.off("ready_status");
      socket.off("topic_update");
      socket.off("filter_update");
      socket.off("submitted_update");
      socket.off("cards_update");
      socket.off("game_restarted");
      socket.off("reveal_cards");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleJoin = (joinName: string) => {
    setName(joinName);
    socket.emit("join", joinName);
    setJoined(true);
  };

  const handleRestart = () => {
    socket.emit("ready_for_restart");
  };

  const socketId = socket.id;
  const isHost = socketId === hostId;

  const handleSubmitCard = () => {
    if (!draftCard.trim() || !submissionAllowed) return;
    socket.emit("submit_card", draftCard.trim());
    setSubmitted(true);
    setSubmissionAllowed(false);
  };

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
      {!joined ? (
        <Title onJoin={handleJoin} />
      ) : (
        <>
          {/* メインコンテンツ */}
          <div style={{ flexGrow: 1 }}>
            {/* 右上にTimer固定配置 */}
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

            {isHost ? (
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
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                name={p.name}
                card={cards[p.id] || ""}
                editable={p.id === socketId && !submitted && submissionAllowed}
                isMe={p.id === socketId}
                draftCard={p.id === socketId ? draftCard : undefined}
                setDraftCard={
                  p.id === socketId && !submitted && submissionAllowed ? setDraftCard : undefined
                }
                onSubmitCard={
                  p.id === socketId && !submitted && submissionAllowed ? handleSubmitCard : undefined
                }
                submissionAllowed={submissionAllowed}
                hasSubmitted={submittedPlayers.has(p.id)}
              />
            ))}

            {phase === "reveal" && (
              <button
                onClick={() => socket.emit("start_voting")}
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
          </div>

          {/* フッター部分 */}
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
        </>
      )}
    </div>
  );
}
export default App;
