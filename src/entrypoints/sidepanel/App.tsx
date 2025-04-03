import React from "react";

const App: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">侧边栏</h1>
        <p className="text-gray-600 text-center">
          这是一个基础的侧边栏界面。您可以在此处添加更多内容。
        </p>
      </div>
    </div>
  );
};

export default App;
