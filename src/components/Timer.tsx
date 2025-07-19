// src/components/Timer.tsx

type TimerProps = {
  timeLeft: number;
};

export const Timer = ({ timeLeft }: TimerProps) => {
  const getColor = () => {
    if (timeLeft > 10) return "green";
    if (timeLeft > 5) return "orange";
    return "red";
  };

  return (
    <div
      style={{
        fontSize: "1.5rem",
        fontWeight: "bold",
        color: getColor(),
        transition: "color 0.5s ease",
      }}
    >
      残り時間: {timeLeft}秒
    </div>
  );
};
