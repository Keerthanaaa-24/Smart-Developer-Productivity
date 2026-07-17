import MainLayout from "../layouts/MainLayout";

const GithubIntegration = () => {

  return (

    <MainLayout>

      <div className="bg-white p-8 rounded-xl shadow-md">

        <h1 className="text-3xl font-bold mb-5">
          GitHub Integration
        </h1>

        <p className="text-gray-600">
          Connect your GitHub account to
          track repositories, commits,
          pull requests, and coding activity.
        </p>

      </div>

    </MainLayout>
  );
};

export default GithubIntegration;