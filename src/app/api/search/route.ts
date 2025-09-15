import { NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    console.log('Pinecone search API called with query:', query);

    if (!query) {
        return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    try {
        const index = getPineconeIndex();

        // Get all players and filter client-side since Pinecone doesn't support regex filters
        const searchResults = await index.query({
            vector: new Array(9).fill(0), // Dummy vector since we're searching all
            topK: 100, // Get all available players
            includeMetadata: true
        });

        console.log(`Pinecone returned ${searchResults.matches?.length || 0} total matches`);

        // Filter results by name similarity on the client side
        const filteredResults = searchResults.matches?.filter(match => {
            const playerName = match.metadata?.name?.toLowerCase() || '';
            const searchQuery = query.toLowerCase();
            return playerName.includes(searchQuery);
        }) || [];

        console.log(`Client-side filtering found ${filteredResults.length} matches for "${query}"`);

        if (filteredResults.length === 0) {
            return NextResponse.json([]);
        }

        // Use the filtered results, limit to 5
        const limitedResults = { matches: filteredResults.slice(0, 5) };

        // Get detailed stats for the matched players
        const playersWithStats = await Promise.all(
            filteredResults.slice(0, 5).map(async (match) => {
                const playerId = parseInt(match.id);
                const metadata = match.metadata;

                console.log(`Getting stats for ${metadata?.name} (ID: ${playerId})`);

                // Get player stats from NBA API
                const playerStats = await getPlayerStats(playerId, metadata?.name as string);

                return {
                    id: playerId,
                    name: metadata?.name as string,
                    team: metadata?.team as string,
                    teamAbbr: extractTeamAbbr(metadata?.team as string),
                    position: metadata?.position as string,
                    imageUrl: metadata?.imageUrl as string,
                    stats: playerStats
                };
            })
        );

        console.log(`Returning ${playersWithStats.length} players with stats`);
        return NextResponse.json(playersWithStats);

    } catch (error) {
        console.error('Pinecone Search Error:', error);
        return NextResponse.json({
            error: 'Failed to search players'
        }, { status: 500 });
    }
}

// Helper function to get player stats (reused from original)
async function getPlayerStats(playerId: number, playerName: string) {
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
            const games = statsData.resultSets[0]?.rowSet || [];

            if (games.length > 0) {
                // Calculate averages
                const totals = games.reduce((acc: any, game: any[]) => {
                    return {
                        games: acc.games + 1,
                        points: acc.points + (game[24] || 0),
                        rebounds: acc.rebounds + (game[18] || 0),
                        assists: acc.assists + (game[19] || 0),
                        steals: acc.steals + (game[20] || 0),
                        blocks: acc.blocks + (game[21] || 0)
                    };
                }, { games: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 });

                if (totals.games > 0) {
                    return {
                        points: (totals.points / totals.games).toFixed(1),
                        rebounds: (totals.rebounds / totals.games).toFixed(1),
                        assists: (totals.assists / totals.games).toFixed(1),
                        steals: (totals.steals / totals.games).toFixed(1),
                        blocks: (totals.blocks / totals.games).toFixed(1),
                        gamesPlayed: totals.games
                    };
                }
            }
        }
    } catch (error) {
        console.log(`Failed to get stats for ${playerName}:`, error);
    }

    return null;
}

// Helper function to extract team abbreviation
function extractTeamAbbr(teamName: string): string {
    if (!teamName) return 'FA';

    // Simple mapping for common team names to abbreviations
    const teamMappings: { [key: string]: string } = {
        'Los Angeles Lakers': 'LAL',
        'Golden State Warriors': 'GSW',
        'Boston Celtics': 'BOS',
        'Miami Heat': 'MIA',
        'Free Agent': 'FA'
        // Add more mappings as needed
    };

    return teamMappings[teamName] || teamName.split(' ').map(word => word[0]).join('').toUpperCase();
}