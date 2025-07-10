"use client";

import { useState } from 'react';
import PlayerCard from '@/components/PlayerCard';
import { Player } from '@/lib/mock-data';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResults([]);

    if (!query) {
      setLoading(false);
      return;
    }

    try {
      // Pass the query to the API route
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      let data = await response.json();

      if (!Array.isArray(data)) {
        data = [data];
      }

      setResults(data);
    } catch (error) {
      console.error("Failed to fetch search results:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Find Your Next Player
        </h1>
        <form className="flex items-center gap-4" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="e.g., LeBron James"
            className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={query} // <-- Controlled input
            onChange={(e) => setQuery(e.target.value)} // <-- Update state on change
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500"
            disabled={loading || !query}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        <div className="mt-12 flex flex-col gap-4">
          {results.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </main>
  );
}