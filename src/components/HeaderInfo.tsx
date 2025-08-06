import React from "react";

type HeaderInfoProps = {
  currentTopicTitle: string | null;
  isFilterer: boolean;
  currentFilter: string | null;
};

export const HeaderInfo: React.FC<HeaderInfoProps> = ({
  currentTopicTitle,
  isFilterer,
  currentFilter,
}) => {
  return (
    <header>
      <h2>お題: {currentTopicTitle || "まだお題がありません"}</h2>

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
    </header>
  );
};
