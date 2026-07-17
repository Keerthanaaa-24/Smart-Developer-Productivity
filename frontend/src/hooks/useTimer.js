import {
  useEffect,
  useState,
} from "react";

const useTimer = (
  initialMinutes = 25
) => {

  const [minutes, setMinutes] =
    useState(initialMinutes);

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

            alert(
              "Pomodoro Session Completed!"
            );

          } else {

            setMinutes(minutes - 1);

            setSeconds(59);
          }
        }

      }, 1000);
    }

    return () => clearInterval(interval);

  }, [
    seconds,
    minutes,
    isRunning,
  ]);

  const startTimer = () => {

    setIsRunning(true);
  };

  const pauseTimer = () => {

    setIsRunning(false);
  };

  const resetTimer = () => {

    setMinutes(initialMinutes);

    setSeconds(0);

    setIsRunning(false);
  };

  return {
    minutes,
    seconds,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
  };
};

export default useTimer;