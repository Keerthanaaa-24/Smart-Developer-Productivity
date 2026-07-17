import Sidebar from "../components/common/Sidebar";

import Navbar from "../components/common/Navbar";

import Footer from "../components/common/Footer";

const MainLayout = ({
  children,
}) => {

  return (

    <div className="flex min-h-screen bg-gray-100">

      <Sidebar />

      <div className="flex-1 flex flex-col">

        <Navbar />

        <main className="flex-1 p-6">

          {children}

        </main>

        <Footer />

      </div>

    </div>
  );
};

export default MainLayout;