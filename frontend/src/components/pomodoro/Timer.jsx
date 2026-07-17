import { useEffect, useState } from "react";

import TimerControls from "./TimerControls";

const Timer = () => {

  const [minutes, setMinutes] =
    useState(25);

  const [seconds, setSeconds] =
    useState(0);

  const [isRunning, setIsRunning] =
    useState(false);

  useEffect(() => {

    let interval;

    if (isRunning) {

      interval = setInterval(() => {

        if (seconds > 0) {

          setSeconds(seconds - 1);

        } else {

          if (minutes === 0) {

            clearInterval(interval);

            setIsRunning(false);

            alert("Pomodoro Session Completed!");

          } else {

            setMinutes(minutes - 1);

            setSeconds(59);
          }
        }

      }, 1000);
    }

    return () => clearInterval(interval);

  }, [seconds, minutes, isRunning]);

  const resetTimer = () => {

    setMinutes(25);

    setSeconds(0);

    setIsRunning(false);
  };

  return (

    <div className="bg-white p-8 rounded-xl shadow-lg text-center">

      <h1 className="text-3xl font-bold mb-6">
        Pomodoro Timer 🍅
      </h1>

      <div className="text-7xl font-bold text-blue-600 mb-8">

        {String(minutes).padStart(2, "0")}
        :
        {String(seconds).padStart(2, "0")}

      </div>

      <TimerControls
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        resetTimer={resetTimer}
      />

    </div>
  );
};

export default Timer;