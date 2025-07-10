import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    console.log('API called with query:', query);

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    try {
        // Get all NBA players
        const response = await fetch(
            'https://stats.nba.com/stats/commonallplayers?LeagueID=00&Season=2024-25&IsOnlyCurrentSeason=0',
            {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Host': 'stats.nba.com',
                    'Origin': 'https://www.nba.com',
                    'Referer': 'https://www.nba.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'x-nba-stats-origin': 'stats',
                    'x-nba-stats-token': 'true'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API failed: ${response.status}`);
        }

        const data = await response.json();
        const players = data.resultSets[0].rowSet;

        console.log(`Searching through ${players.length} players for: "${query}"`);

        // Search for players matching the query
        const matchingPlayers = players.filter((player: any[]) => {
            // Safety checks
            if (!player || player.length < 4) return false;

            const playerName = player[2]; // Index 2 is "First Last" format
            const rosterStatus = player[3]; // Index 3 is roster status

            // Only search active players (status = 1)
            if (rosterStatus !== 1) return false;

            // Make sure we have a valid name
            if (typeof playerName !== 'string') return false;

            // Simple name search
            return playerName.toLowerCase().includes(query.toLowerCase());
        });

        console.log(`Found ${matchingPlayers.length} matching players`);

        if (matchingPlayers.length === 0) {
            return NextResponse.json([]);
        }

        // Get stats for each matching player (limit to 5 for performance)
        const playersToProcess = matchingPlayers.slice(0, 5);
        const playersWithStats = await Promise.all(
            playersToProcess.map(async (player: any[]) => {
                const playerId = player[0];           // Index 0 = Player ID
                const playerName = player[2];         // Index 2 = "First Last" name
                const teamName = player[10] || 'Free Agent';     // Index 10 = Team name  
                const teamAbbr = player[11] || 'FA';             // Index 11 = Team abbreviation

                console.log(`Getting stats for ${playerName} (ID: ${playerId})`);

                try {
                    // Get player's game log for current season
                    const statsResponse = await fetch(
                        `https://stats.nba.com/stats/playergamelog?PlayerID=${playerId}&Season=2024-25&SeasonType=Regular+Season`,
                        {
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Accept-Language': 'en-US,en;q=0.9',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Connection': 'keep-alive',
                                'Host': 'stats.nba.com',
                                'Origin': 'https://www.nba.com',
                                'Referer': 'https://www.nba.com/',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'x-nba-stats-origin': 'stats',
                                'x-nba-stats-token': 'true'
                            }
                        }
                    );

                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        const games = statsData.resultSets[0].rowSet;

                        if (games.length > 0) {
                            // Calculate season averages with safety checks
                            const totals = games.reduce((acc: any, game: any[]) => {
                                if (!game || game.length < 25) return acc; // Safety check

                                return {
                                    points: acc.points + (Number(game[24]) || 0),
                                    rebounds: acc.rebounds + (Number(game[18]) || 0),
                                    assists: acc.assists + (Number(game[19]) || 0),
                                    steals: acc.steals + (Number(game[20]) || 0),
                                    blocks: acc.blocks + (Number(game[21]) || 0),
                                    games: acc.games + 1
                                };
                            }, { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, games: 0 });

                            if (totals.games > 0) {
                                console.log(`${playerName}: ${totals.games} games, ${(totals.points / totals.games).toFixed(1)} PPG`);

                                return {
                                    id: playerId,
                                    name: playerName,
                                    team: teamName,
                                    teamAbbr: teamAbbr,
                                    position: 'Player',
                                    imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`,
                                    stats: {
                                        points: (totals.points / totals.games).toFixed(1),
                                        rebounds: (totals.rebounds / totals.games).toFixed(1),
                                        assists: (totals.assists / totals.games).toFixed(1),
                                        steals: (totals.steals / totals.games).toFixed(1),
                                        blocks: (totals.blocks / totals.games).toFixed(1),
                                        gamesPlayed: totals.games
                                    }
                                };
                            }
                        }
                    }
                } catch (error) {
                    console.log(`Failed to get stats for ${playerName}:`, error);
                }

                // Return player without stats if stats API fails
                return {
                    id: playerId,
                    name: playerName,
                    team: teamName,
                    teamAbbr: teamAbbr,
                    position: 'Player',
                    imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`,
                    stats: null
                };
            })
        );

        console.log(`Returning ${playersWithStats.length} players`);
        return NextResponse.json(playersWithStats);

    } catch (error) {
        console.error('NBA API Error:', error);
        return NextResponse.json({
            error: 'Failed to search players'
        }, { status: 500 });
    }
}