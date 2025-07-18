import { useState } from "react";

type EventProps = {
  title: string;
  truth: string;
  filterViews: string[];  // 同じフィルターの複数見え方
};

export const EventCard = ({ title, truth, filterViews }: EventProps) => {
  const [showTruth, setShowTruth] = useState(false);

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem" }}>
      <h2>{title}</h2>

      <div style={{ marginTop: "1rem" }}>
        <strong>見え方：</strong>
        <ul>
          {filterViews.map((view, i) => (
            <li key={i}>{view}</li>
          ))}
        </ul>
      </div>

      {showTruth ? (
        <p style={{ marginTop: "1rem" }}>
          <strong>真相：</strong>
          {truth}
        </p>
      ) : (
        <button onClick={() => setShowTruth(true)} style={{ marginTop: "1rem" }}>
          真相を表示する
        </button>
      )}
    </div>
  );
};
