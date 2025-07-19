import React from "react";

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
  voted?: boolean;
  votedByMe?: boolean;
  votedByOthers: number;
  isFilterer?: boolean; // 追加
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
  voted = false,
  votedByMe = false,
  votedByOthers = 0,
  isFilterer = false, // 追加: フィルタラーかどうか
}: PlayerCardProps) => {
  const baseStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 0, // 👈 これを追加する
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1rem",
    background: isMe
      ? "linear-gradient(135deg, #bbdefb 0%, #90caf9 100%)"
      : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
    boxShadow: isMe
      ? "0 8px 16px rgba(33, 150, 243, 0.5)"
      : "0 4px 8px rgba(0, 0, 0, 0.1)",
    border: isMe ? "2px solid #1976d2" : "1px solid #ccc",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: onVote ? "pointer" : "default",
    userSelect: onVote ? "none" : "auto",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onVote && !voted) {
      e.currentTarget.style.transform = "scale(1.03)";
      e.currentTarget.style.boxShadow = "0 12px 24px rgba(25, 118, 210, 0.7)";
    }
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onVote && !voted) {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = baseStyle.boxShadow as string;
    }
  };

  return (
    <div
      style={baseStyle}
      onClick={() => {
        if (!voted && onVote) onVote();
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onVote ? "button" : undefined}
      tabIndex={onVote ? 0 : undefined}
      aria-pressed={false}
    >
      <strong>{name}</strong>
      {isMe && <span>（あなた）</span>}

      {/* 投票済みチェックマーク */}
      {voted && votedByMe && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "24px",
            height: "24px",
            backgroundColor: "#1976d2",
            borderRadius: "50%",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold",
            fontSize: "18px",
            userSelect: "none",
          }}
          aria-label="投票済み"
          title="あなたはこのカードに投票済みです"
        >
          ✓
        </div>
      )}
      {votedByOthers > 0 && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: voted && votedByMe ? "40px" : "8px",
            display: "flex",
            gap: "4px", // バッジ同士の間隔
          }}
          aria-label={`他の参加者からの投票数: ${votedByOthers}`}
          title={`他の参加者からの投票数: ${votedByOthers}`}
        >
          {Array.from({ length: votedByOthers }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "24px",
                height: "24px",
                backgroundColor: "#4b4b4bff",
                borderRadius: "50%",
                color: "white",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "14px",
                userSelect: "none",
                lineHeight: 1,
                zIndex: 3, // 👈これを追加
              }}
              aria-hidden="true"
            >
              ✓
            </div>
          ))}
        </div>
      )}

      {/* フィルタラー表示 */}
      {isFilterer && (
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "24px",
            height: "24px",
            backgroundColor: "#f44336",
            borderRadius: "50%",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: "bold",
            fontSize: "16px",
            userSelect: "none",
            fontFamily: "sans-serif",
            zIndex: 2, // 👈これを追加
          }}
          aria-label="フィルタラー"
          title="フィルタラーです"
        >
          🔍
        </div>
      )}



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
                border: "1px solid #90caf9",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              disabled={!editable}
            />
            <button
              onClick={onSubmitCard}
              style={{
                marginTop: "0.5rem",
                padding: "0.4rem 1rem",
                fontSize: "1rem",
                backgroundColor: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor:
                  !draftCard || draftCard.trim() === "" || !editable
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !draftCard || draftCard.trim() === "" || !editable ? 0.6 : 1,
                transition: "background-color 0.2s ease",
              }}
              disabled={!draftCard || draftCard.trim() === "" || !editable}
              onMouseEnter={(e) => {
                if (draftCard && draftCard.trim() !== "" && editable)
                  e.currentTarget.style.backgroundColor = "#115293";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1976d2";
              }}
            >
              提出
            </button>
          </>
        ) : (
          <p style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "1rem" }}>
            {isMe
              ? draftCard || card || "（考え中...）"
              : hasSubmitted
              ? card || "（提出済み）"
              : "（考え中...）"}
          </p>
        )}
      </div>
    </div>
  );
};
