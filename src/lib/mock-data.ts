export type Player = {
    id: number;
    name: string;
    team: string;
    position: string;
    imageUrl: string;
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