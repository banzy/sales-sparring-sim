import { useState, useEffect } from "react";

export function LcdClock() {
  const [time, setTime] = useState(() => new Date());
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setColonVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="lcd-clock">
      <span className="date">{dateStr}</span>
      <span>{hours}</span>
      <span className={`colon ${colonVisible ? "" : "hidden"}`}>:</span>
      <span>{minutes}</span>
    </div>
  );
}
