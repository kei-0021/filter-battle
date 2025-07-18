import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

type Player = {
  id: string;
  name: string;
};

type Topic = {
  id: number;
  title: string;
  filter: string;
};

type CardsMap = {
  [playerId: string]: string;
};

function PlayerCard({
  name,
  card,
  editable,
  isMe,
  draftCard,
  setDraftCard,
  onSubmitCard,
}: {
  name: string;
  card: string;
  editable: boolean;
  isMe: boolean;
  draftCard?: string;
  setDraftCard?: (value: string) => void;
  onSubmitCard?: () => void;
}) {
  return (
    <div
      style={{
        border: "2px solid #90caf9",
        backgroundColor: isMe ? "#e3f2fd" : "#f0f0f0",
        borderRadius: "10px",
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <strong>{name}</strong>
      {isMe && <span>（あなた）</span>}
      <div style={{ marginTop: "0.5rem" }}>
        {editable ? (
          <>
            <textarea
              value={draftCard}
              onChange={(e) => setDraftCard && setDraftCard(e.target.value)}
              placeholder="カードの内容を入力"
              style={{
                width: "100%",
                height: "80px",
                padding: "0.5rem",
                fontSize: "1rem",
                borderRadius: "6px",
              }}
              disabled={!editable}
            />
            <button
              onClick={onSubmitCard}
              style={{
                marginTop: "0.5rem",
                padding: "0.3rem 0.7rem",
                fontSize: "1rem",
                cursor: editable ? "pointer" : "not-allowed",
              }}
              disabled={!draftCard || draftCard.trim() === "" || !editable}
            >
              提出
            </button>
          </>
        ) : (
          <p style={{ whiteSpace: "pre-wrap" }}>{card || "（未入力）"}</p>
        )}
      </div>
    </div>
  );
}

function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [cards, setCards] = useState<CardsMap>({});
  const [draftCard, setDraftCard] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    socket.on("players_update", ({ players, hostId }: { players: Player[]; hostId: string | null }) => {
      setPlayers(players);
      setHostId(hostId);
    });

    socket.on("ready_status", ({ readyCount, totalCount }: { readyCount: number; totalCount: number }) => {
      setReadyCount(readyCount);
      setTotalCount(totalCount);
    });

    socket.on("topic_update", (topic: Topic | null) => {
      setCurrentTopic(topic);
      setDraftCard("");
      setSubmitted(false); // お題変わったら提出状態リセット
    });

    socket.on("cards_update", (newCards: CardsMap) => {
      setCards(newCards);
    });

    socket.on("game_restarted", () => {
      setSubmitted(false); // ゲーム再開時にもリセット
      setDraftCard("");
    });

    return () => {
      socket.off("players_update");
      socket.off("ready_status");
      socket.off("topic_update");
      socket.off("cards_update");
      socket.off("game_restarted");
    };
  }, []);

  const handleJoin = () => {
    if (!name.trim()) return;
    socket.emit("join", name);
    setJoined(true);
  };

  const handleRestart = () => {
    socket.emit("ready_for_restart");
  };

  const socketId = socket.id;
  const isHost = socketId === hostId;

  const handleSubmitCard = () => {
    if (!draftCard.trim()) return;
    socket.emit("submit_card", draftCard.trim());
    setSubmitted(true);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      {!joined ? (
        <>
          <h2>名前を入力して参加</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前"
            style={{ padding: "0.5rem", fontSize: "1rem" }}
          />
          <button onClick={handleJoin} style={{ marginLeft: "1rem", padding: "0.5rem 1rem" }}>
            参加
          </button>
        </>
      ) : (
        <>
          <h2>お題: {currentTopic ? currentTopic.title : "まだお題がありません"}</h2>

          {isHost ? (
            <p style={{ color: "red", fontWeight: "bold", fontSize: "20px" }}>あなたが親です</p>
          ) : (
            <h3>親を当てましょう!</h3>
          )}

          <h2>プレイヤーリスト</h2>
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              name={p.name}
              card={cards[p.id] || ""}
              editable={p.id === socketId && !submitted}
              isMe={p.id === socketId}
              draftCard={p.id === socketId ? draftCard : undefined}
              setDraftCard={p.id === socketId && !submitted ? setDraftCard : undefined}
              onSubmitCard={p.id === socketId && !submitted ? handleSubmitCard : undefined}
            />
          ))}

          <button onClick={handleRestart} style={{ padding: "0.5rem 1rem" }}>
            もう一度遊ぶ (全員準備完了で再スタート)
          </button>

          <p>
            {readyCount} / {totalCount}人が準備済みです
          </p>
        </>
      )}
    </div>
  );
}

export default App;
