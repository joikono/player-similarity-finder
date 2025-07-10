import { NextResponse } from 'next/server';

// helper function to fetch player stats
async function getPlayerStats(playerId: number) {
    try {
        const response = await fetch(
            `https://www.balldontlie.io/api/v1/season_averages?season=2023&player_ids[]=${playerId}`
        );
        const data = await response.json();
        return data.data[0] || null;
    } catch (error) {
        console.error("Failed to fetch player stats:", error);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    try {
        // 1. Search for the player by name
        const playerSearchResponse = await fetch(
            `https://www.balldontlie.io/api/v1/players?search=${query}`
        );
        const playerSearchData = await playerSearchResponse.json();
        const players = playerSearchData.data;

        if (!players || players.length === 0) {
            return NextResponse.json([]);
        }

        // 2. For each found player, get their stats and format the data
        const formattedPlayers = await Promise.all(
            players.map(async (player: any) => {
                const stats = await getPlayerStats(player.id);

                // balldontlie.io doesn't provide image URLs. We construct a URL based on a known pattern.
                // This is a simplification and might not work for all players.
                const imageUrl = `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${player.id}.png`;

                return {
                    id: player.id,
                    name: `${player.first_name} ${player.last_name}`,
                    team: player.team.full_name,
                    position: player.position,
                    imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png`, // Placeholder for now
                    stats: {
                        points: stats?.pts ?? 0,
                        assists: stats?.ast ?? 0,
                        rebounds: stats?.reb ?? 0,
                        steals: stats?.stl ?? 0,
                        blocks: stats?.blk ?? 0,
                        turnovers: stats?.turnover ?? 0,
                        fieldGoalPercentage: stats?.fg_pct ?? 0,
                        threePointPercentage: stats?.fg3_pct ?? 0,
                        freeThrowPercentage: stats?.ft_pct ?? 0,
                    },
                };
            })
        );

        return NextResponse.json(formattedPlayers);

    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 });
    }
}