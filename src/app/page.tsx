"use client";

import { useState } from 'react';
import PlayerCard from '@/components/PlayerCard';

type Player = {
  id: number;
  name: string;
  team: string;
  teamAbbr: string;
  position: string;
  imageUrl: string;
  stats: {
    points: string;
    rebounds: string;
    assists: string;
    steals: string;
    blocks: string;
    gamesPlayed: number;
  } | null;
};

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setSearched(false);

    console.log('Starting search for:', query);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      console.log('Search results:', data);

      if (response.ok) {
        setResults(Array.isArray(data) ? data : []);
      } else {
        console.error('Search failed:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          NBA Player Similarity Search
        </h1>

        <form className="flex items-center gap-4 mb-8" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for NBA players (e.g., LeBron, Curry, Durant)"
            className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center text-gray-400">
              Searching NBA players...
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="text-center text-gray-400">
              No players found for "{query}"
            </div>
          )}

          {results.map((player) => (
            <div key={player.id} className="space-y-4">
              <PlayerCard player={player} />

              {player.stats && (
                <div className="ml-8 p-4 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                  <h3 className="text-lg font-bold mb-3 text-blue-400">2024-25 Season Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{player.stats.points}</div>
                      <div className="text-sm text-gray-400">PPG</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{player.stats.rebounds}</div>
                      <div className="text-sm text-gray-400">RPG</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{player.stats.assists}</div>
                      <div className="text-sm text-gray-400">APG</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{player.stats.steals}</div>
                      <div className="text-sm text-gray-400">SPG</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{player.stats.blocks}</div>
                      <div className="text-sm text-gray-400">BPG</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">{player.stats.gamesPlayed}</div>
                      <div className="text-sm text-gray-400">Games</div>
                    </div>
                  </div>
                </div>
              )}

              {!player.stats && (
                <div className="ml-8 p-4 bg-gray-800 rounded-lg border-l-4 border-gray-500">
                  <div className="text-gray-400">No 2024-25 season stats available</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instructions */}
        {!searched && (
          <div className="mt-12 text-center text-gray-400">
            <p className="mb-2">Search for your favorite NBA players!</p>
            <p className="text-sm">Try: "LeBron", "Curry", "Durant", "Giannis", "Embiid"</p>
          </div>
        )}
      </div>
    </main>
  );
}