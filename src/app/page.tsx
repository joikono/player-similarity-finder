"use client";

import { useState } from 'react';

export default function HomePage() {
  const [apiResult, setApiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/search');
      const data = await response.json();
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: 'Failed to call API' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          API Connection Test
        </h1>

        <button
          onClick={testAPI}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500"
        >
          {loading ? 'Testing API...' : 'Test NBA.com Connection'}
        </button>

        {apiResult && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4">API Result:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}