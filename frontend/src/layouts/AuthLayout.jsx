const AuthLayout = ({
  children,
}) => {

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600">

      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md">

        {children}

      </div>

    </div>
  );
};

export default AuthLayout;