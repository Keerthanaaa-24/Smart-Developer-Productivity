import MainLayout from "../layouts/MainLayout";

const Settings = () => {

  return (

    <MainLayout>

      <div className="bg-white p-8 rounded-xl shadow-md">

        <h1 className="text-3xl font-bold mb-5">
          Settings
        </h1>

        <p className="text-gray-600">
          Customize your dashboard preferences,
          themes, notifications, and integrations.
        </p>

      </div>

    </MainLayout>
  );
};

export default Settings;