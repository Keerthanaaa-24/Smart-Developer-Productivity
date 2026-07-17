import { Link } from "react-router-dom";

const Home = () => {

  return (

    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">

      <h1 className="text-6xl font-bold mb-6 text-center">
        Smart Developer Productivity Dashboard 🚀
      </h1>

      <p className="text-xl mb-8 text-center max-w-2xl">
        Track coding productivity, manage tasks,
        analyze performance, and boost focus
        with AI-powered insights.
      </p>

      <div className="flex gap-5">

        <Link
          to="/login"
          className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold"
        >
          Login
        </Link>

        <Link
          to="/register"
          className="bg-black px-6 py-3 rounded-lg font-semibold"
        >
          Register
        </Link>

      </div>

    </div>
  );
};

export default Home;