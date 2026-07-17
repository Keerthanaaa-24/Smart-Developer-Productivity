import MainLayout from "../layouts/MainLayout";

import Timer from "../components/pomodoro/Timer";

import SessionStats from "../components/pomodoro/SessionStats";

const Pomodoro = () => {

  return (

    <MainLayout>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <Timer />

        <SessionStats />

      </div>

    </MainLayout>
  );
};

export default Pomodoro;