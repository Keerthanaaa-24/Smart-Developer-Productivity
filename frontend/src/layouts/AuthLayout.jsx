const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl rounded-3xl p-6 sm:p-10 w-full max-w-md border border-white/20 dark:border-slate-800 transition-colors duration-200">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;