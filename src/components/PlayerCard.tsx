import Image from 'next/image';

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
    return (
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
        </div>
    );
}