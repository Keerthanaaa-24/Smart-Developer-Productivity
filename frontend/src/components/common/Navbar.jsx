import { FaBell } from "react-icons/fa";

const Navbar = () => {

  return (

    <div className="bg-white shadow-md px-6 py-4 flex items-center justify-between">

      <h1 className="text-2xl font-bold text-blue-600">
        Smart Developer Dashboard
      </h1>

      <div className="flex items-center gap-5">

        <button className="text-xl text-gray-600">
          <FaBell />
        </button>

        <div className="flex items-center gap-3">

          <img
            src="https://i.pravatar.cc/40"
            alt="profile"
            className="w-10 h-10 rounded-full"
          />

          <div>

            <p className="font-semibold">
              Keerthu
            </p>

            <p className="text-sm text-gray-500">
              Developer
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Navbar;