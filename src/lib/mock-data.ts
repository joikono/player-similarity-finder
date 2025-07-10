export type Player = {
    id: number;
    name: string;
    team: string;
    isActive: boolean;
    stats?: {
        points: string;
        rebounds: string;
        assists: string;
        steals: string;
        blocks: string;
        gamesPlayed: number;
    } | null;
};

// Remove the mock data since we're using real API
export const mockPlayers: Player[] = [];