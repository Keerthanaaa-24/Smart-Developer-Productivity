import MainLayout from "../layouts/MainLayout";

const Profile = () => {

  return (

    <MainLayout>

      <div className="bg-white p-8 rounded-xl shadow-md">

        <div className="flex items-center gap-6">

          <img
            src="https://i.pravatar.cc/120"
            alt="profile"
            className="w-28 h-28 rounded-full"
          />

          <div>

            <h1 className="text-3xl font-bold">
              Keerthu
            </h1>

            <p className="text-gray-600 mt-2">
              Full Stack Developer
            </p>

          </div>

        </div>

      </div>

    </MainLayout>
  );
};

export default Profile;