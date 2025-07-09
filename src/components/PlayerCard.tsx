import Image from 'next/image';
import { Player } from '@/lib/mock-data';

type PlayerCardProps = {
    player: Player;
};

export default function PlayerCard({ player }: PlayerCardProps) {
    return (
        <div className="flex items-center gap-6 p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-all">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gray-600">
                <Image
                    src={player.imageUrl}
                    alt={`Photo of ${player.name}`}
                    fill
                    style={{ objectFit: 'cover' }} 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
            <div>
                <h3 className="text-2xl font-bold">{player.name}</h3>
                <p className="text-gray-400">
                    {player.team} | {player.position}
                </p>
            </div>
        </div>
    );
}