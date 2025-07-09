import PlayerCard from '@/components/PlayerCard';
import { mockPlayers } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Find Your Next Player
        </h1>

        <form className="flex items-center gap-4">
          <input
            type="text"
            placeholder="e.g., LeBron James"
            className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {/* Results Area - NOW WITH CONTENT */}
        <div className="mt-12 flex flex-col gap-4">
          {mockPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </main>
  );
}