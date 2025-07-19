
type PlayerCardProps = {
  name: string;
  card: string;
  editable: boolean;
  isMe: boolean;
  draftCard?: string;
  setDraftCard?: (value: string) => void;
  onSubmitCard?: () => void;
  submissionAllowed: boolean;
  hasSubmitted: boolean;
  onVote?: () => void; // 投票クリック用
};

export const PlayerCard = ({
  name,
  card,
  editable,
  isMe,
  draftCard,
  setDraftCard,
  onSubmitCard,
  submissionAllowed,
  hasSubmitted,
  onVote,
}: PlayerCardProps) => {
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
          <p style={{ whiteSpace: "pre-wrap" }}>
            {isMe
              ? draftCard || card || "（考え中...）"
              : hasSubmitted
              ? card || "（提出済み）"
              : "（考え中...）"
            }
          </p>
        )}
      </div>
    </div>
  );
};
