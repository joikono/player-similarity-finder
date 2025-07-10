import Image from 'next/image';
import { Player } from '@/lib/mock-data';
import { useState } from 'react';

type PlayerCardProps = {
    player: Player;
};

export default function PlayerCard({ player }: PlayerCardProps) {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    // Fallback image URL
    const fallbackImage = '/next.svg'; // You can replace this with a proper NBA placeholder

    const handleImageError = () => {
        setImageError(true);
        setImageLoading(false);
    };

    const handleImageLoad = () => {
        setImageLoading(false);
    };

    return (
        <div className="flex items-center gap-6 p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-all">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-700 flex items-center justify-center">
                {!imageError && player.imageUrl ? (
                    <Image
                        src={player.imageUrl}
                        alt={`Photo of ${player.name}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="96px"
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        className={`transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                            {player.name ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                        </span>
                    </div>
                )}
                {imageLoading && !imageError && (
                    <div className="absolute inset-0 bg-gray-600 animate-pulse rounded-full" />
                )}
            </div>
            <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">{player.name || 'Unknown Player'}</h3>
                <p className="text-gray-400">
                    {player.team || 'Unknown Team'} | {player.position || 'Unknown Position'}
                </p>
                {/* Optional: Display some stats if available */}
                {player.stats && (
                    <div className="mt-2 flex gap-4 text-sm text-gray-300">
                        <span>PPG: {player.stats.points.toFixed(1)}</span>
                        <span>RPG: {player.stats.rebounds.toFixed(1)}</span>
                        <span>APG: {player.stats.assists.toFixed(1)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}