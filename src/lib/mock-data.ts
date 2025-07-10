export type PlayerStats = {
    points: number;
    assists: number;
    rebounds: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fieldGoalPercentage: number;
    threePointPercentage: number;
    freeThrowPercentage: number;
};

export type Player = {
    id: number;
    name: string;
    team: string;
    position: string;
    imageUrl: string;
    stats?: PlayerStats; // Optional since mock data might not have stats
};

export const mockPlayers: Player[] = [
    {
        id: 1,
        name: 'Stephen Curry',
        team: 'Golden State Warriors',
        position: 'Point Guard',
        imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png',
    },
    {
        id: 2,
        name: 'Kevin Durant',
        team: 'Phoenix Suns',
        position: 'Small Forward',
        imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png',
    },
    {
        id: 3,
        name: 'Nikola Jokic',
        team: 'Denver Nuggets',
        position: 'Center',
        imageUrl: 'https://cdn.nba.com/headshots/nba/latest/1040x760/203999.png',
    },
];