import Image from 'next/image';
import { useState } from 'react';

type PlayerCardProps = {
    player: {
        id: number;
        name: string;
        team: string;
        teamAbbr?: string;
        position: string;
        imageUrl: string;
        stats?: any;
    };
};

export default function PlayerCard({ player }: PlayerCardProps) {
    const [similarPlayers, setSimilarPlayers] = useState<PlayerCardProps['player'][]>([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);
    const [showSimilar, setShowSimilar] = useState(false);

    const handleFindSimilar = async () => {
        if (!player.stats) {
            console.log('No stats available for similarity calculation');
            return;
        }

        setLoadingSimilar(true);
        console.log('Finding similar players for:', player.name);

        try {
            const response = await fetch(`/api/similar?playerId=${player.id}`);
            const data = await response.json();

            console.log('Similar players result:', data);

            if (response.ok) {
                setSimilarPlayers(Array.isArray(data) ? data : []);
                setShowSimilar(true);
            } else {
                console.error('Similar players search failed:', data.error);
                setSimilarPlayers([]);
            }
        } catch (error) {
            console.error('Similar players error:', error);
            setSimilarPlayers([]);
        } finally {
            setLoadingSimilar(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Your Exact Original Player Card */}
            <div className="flex items-center gap-6 p-6 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-all">
                <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0">
                    <Image
                        src={player.imageUrl}
                        alt={`Photo of ${player.name}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="80px"
                        onError={(e) => {
                            // Fallback to a generic NBA logo or placeholder
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPk5CQTwvdGV4dD4KPC9zdmc+';
                        }}
                    />
                </div>
                <div className="flex-grow">
                    <h3 className="text-2xl font-bold text-white">{player.name}</h3>
                    <p className="text-gray-400 text-lg">
                        {player.team} {player.teamAbbr && `(${player.teamAbbr})`}
                    </p>
                    <p className="text-blue-400 text-sm mt-1">
                        {player.position}
                    </p>
                </div>

                {/* NEW: Find Similar Players Button */}
                {player.stats && (
                    <div className="flex-shrink-0">
                        <button
                            onClick={handleFindSimilar}
                            disabled={loadingSimilar}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            {loadingSimilar ? 'Finding...' : 'Find Similar'}
                        </button>
                    </div>
                )}
            </div>

            {/* NEW: Similar Players Section */}
            {showSimilar && (
                <div className="ml-8 p-4 bg-gray-800 rounded-lg border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-bold text-purple-400">
                            Players Similar to {player.name}
                        </h4>
                        <button
                            onClick={() => setShowSimilar(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {similarPlayers.length > 0 ? (
                        <div className="space-y-3">
                            {similarPlayers.map((similarPlayer) => (
                                <div key={similarPlayer.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg">
                                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-gray-600 flex-shrink-0">
                                        <Image
                                            src={similarPlayer.imageUrl}
                                            alt={`Photo of ${similarPlayer.name}`}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            sizes="48px"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjI0IiB5PSIyOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1zaXplPSI4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TkJBPC90ZXh0Pgo8L3N2Zz4=';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <h5 className="font-bold text-white">{similarPlayer.name}</h5>
                                        <p className="text-gray-400 text-sm">
                                            {similarPlayer.team} {similarPlayer.teamAbbr && `(${similarPlayer.teamAbbr})`}
                                        </p>
                                        {similarPlayer.stats && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {similarPlayer.stats.points} PPG • {similarPlayer.stats.rebounds} RPG • {similarPlayer.stats.assists} APG
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-400 text-center py-4">
                            No similar players found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}