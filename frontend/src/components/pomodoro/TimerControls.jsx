const TimerControls = ({
  isRunning,
  setIsRunning,
  resetTimer,
}) => {

  return (

    <div className="flex items-center justify-center gap-5">

      <button
        onClick={() =>
          setIsRunning(true)
        }
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
      >
        Start
      </button>

      <button
        onClick={() =>
          setIsRunning(false)
        }
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg"
      >
        Pause
      </button>

      <button
        onClick={resetTimer}
        className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg"
      >
        Reset
      </button>

    </div>
  );
};

export default TimerControls;