import { NextResponse } from 'next/server';

// Cache to store calculated player stats
const playerStatsCache = new Map<string, any>();
const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let lastCacheUpdate = 0;

// Similarity calculation function
function calculateSimilarity(player1: any, player2: any) {
    if (!player1.stats || !player2.stats) return 0;

    const p1 = player1.stats;
    const p2 = player2.stats;

    // Calculate weighted distance between stat profiles
    const pointsDiff = Math.abs(parseFloat(p1.points) - parseFloat(p2.points)) / 30; // Normalize by ~30 PPG max
    const reboundsDiff = Math.abs(parseFloat(p1.rebounds) - parseFloat(p2.rebounds)) / 15; // Normalize by ~15 RPG max
    const assistsDiff = Math.abs(parseFloat(p1.assists) - parseFloat(p2.assists)) / 12; // Normalize by ~12 APG max
    const stealsDiff = Math.abs(parseFloat(p1.steals) - parseFloat(p2.steals)) / 3; // Normalize by ~3 SPG max
    const blocksDiff = Math.abs(parseFloat(p1.blocks) - parseFloat(p2.blocks)) / 3; // Normalize by ~3 BPG max

    // Weighted average (PPG, RPG, APG are most important)
    const distance = (pointsDiff * 0.3) + (reboundsDiff * 0.25) + (assistsDiff * 0.25) +
        (stealsDiff * 0.1) + (blocksDiff * 0.1);

    // Convert distance to similarity (closer = more similar)
    return Math.max(0, 1 - distance);
}

// Helper function to get player stats (reused from search route)
async function getPlayerStats(playerId: number, playerName: string, teamName: string, teamAbbr: string) {
    try {
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
                // Calculate season averages
                const totals = games.reduce((acc: any, game: any[]) => {
                    if (!game || game.length < 25) return acc;

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

    // Return player without stats if API fails
    return {
        id: playerId,
        name: playerName,
        team: teamName,
        teamAbbr: teamAbbr,
        position: 'Player',
        imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`,
        stats: null
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    console.log('Similar players API called for player ID:', playerId);

    if (!playerId) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
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

        // Find the target player
        const targetPlayer = players.find((player: any[]) => player[0] == playerId);
        if (!targetPlayer) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        const targetPlayerName = targetPlayer[2];
        const targetTeamName = targetPlayer[10] || 'Free Agent';
        const targetTeamAbbr = targetPlayer[11] || 'FA';

        console.log(`Finding similar players to: ${targetPlayerName}`);

        // Get stats for the target player
        const targetPlayerWithStats = await getPlayerStats(
            parseInt(playerId),
            targetPlayerName,
            targetTeamName,
            targetTeamAbbr
        );

        if (!targetPlayerWithStats.stats) {
            return NextResponse.json({ error: 'No stats available for target player' }, { status: 400 });
        }

        // Get all active players with stats (limit to reasonable number for performance)
        const activePlayers = players.filter((player: any[]) => {
            const rosterStatus = player[3];
            const currentPlayerId = player[0];
            return rosterStatus === 1 && currentPlayerId != playerId; // Active and not the same player
        });

        console.log(`Comparing against ${activePlayers.length} active players`);

        // Check if cache is expired or empty
        const now = Date.now();
        const cacheExpired = (now - lastCacheUpdate) > cacheExpiry;

        let playersWithValidStats: any[] = [];

        if (playerStatsCache.size === 0 || cacheExpired) {
            console.log('Cache expired or empty, calculating fresh stats...');

            // Get stats for a sample of players (limit to 200 for performance)
            const playersToCompare = activePlayers.slice(0, 200);
            const playersWithStats = await Promise.all(
                playersToCompare.map(async (player: any[]) => {
                    const currentPlayerId = player[0];
                    const currentPlayerName = player[2];
                    const currentTeamName = player[10] || 'Free Agent';
                    const currentTeamAbbr = player[11] || 'FA';

                    return await getPlayerStats(currentPlayerId, currentPlayerName, currentTeamName, currentTeamAbbr);
                })
            );

            // Filter players with stats and store in cache
            playersWithValidStats = playersWithStats.filter(player => player.stats !== null);

            // Update cache
            playerStatsCache.clear();
            playersWithValidStats.forEach(player => {
                playerStatsCache.set(player.id.toString(), player);
            });
            lastCacheUpdate = now;

            console.log(`Cached ${playersWithValidStats.length} players with stats`);
        } else {
            console.log('Using cached player stats...');
            playersWithValidStats = Array.from(playerStatsCache.values());
        }

        const similarities = playersWithValidStats.map(player => ({
            ...player,
            similarity: calculateSimilarity(targetPlayerWithStats, player)
        }));

        // Sort by similarity and get top 3
        const topSimilar = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);

        console.log(`Found ${topSimilar.length} similar players to ${targetPlayerName}`);
        console.log('Top similarities:', topSimilar.map(p => `${p.name}: ${(p.similarity * 100).toFixed(1)}%`));

        // Remove similarity score from response (keep it internal)
        const result = topSimilar.map(({ similarity, ...player }) => player);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Similar players API Error:', error);
        return NextResponse.json({
            error: 'Failed to find similar players'
        }, { status: 500 });
    }
}