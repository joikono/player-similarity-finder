import { NextResponse } from 'next/server';
import { getPineconeIndex } from '@/lib/pinecone';
import { normalizeAndVectorize } from '@/lib/normalization';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    console.log('Pinecone similarity API called for player ID:', playerId);

    if (!playerId) {
        return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    try {
        const index = getPineconeIndex();

        // Step 1: Get the target player's vector from Pinecone
        const targetPlayerData = await index.fetch([playerId]);

        if (!targetPlayerData.records || !targetPlayerData.records[playerId]) {
            return NextResponse.json({ error: 'Player not found in vector database' }, { status: 404 });
        }

        const targetVector = targetPlayerData.records[playerId].values;
        const targetMetadata = targetPlayerData.records[playerId].metadata;

        console.log(`Finding similar players to: ${targetMetadata?.name}`);
        console.log('Target player vector:', targetVector);

        // Step 2: Use Pinecone's vector similarity search
        const similarityResults = await index.query({
            vector: targetVector,
            topK: 10, // Get more results to filter out the target player
            includeMetadata: true
        });

        console.log(`Pinecone found ${similarityResults.matches?.length || 0} similar players`);

        if (!similarityResults.matches || similarityResults.matches.length === 0) {
            return NextResponse.json([]);
        }

        // Filter out the target player and get top 3 similar players
        const filteredMatches = similarityResults.matches.filter(match => match.id !== playerId);
        
        console.log(`After filtering out target player: ${filteredMatches.length} similar players`);

        if (filteredMatches.length === 0) {
            return NextResponse.json([]);
        }

        // Step 3: Get top 3 similar players and fetch their current stats
        const topSimilarPlayers = await Promise.all(
            filteredMatches.slice(0, 3).map(async (match) => {
                const similarPlayerId = parseInt(match.id);
                const metadata = match.metadata;
                const similarity = match.score || 0;

                console.log(`Similar player: ${metadata?.name} (similarity: ${(similarity * 100).toFixed(1)}%)`);

                // Get current season stats for this player
                const currentStats = await getPlayerStats(similarPlayerId, metadata?.name as string);

                return {
                    id: similarPlayerId,
                    name: metadata?.name as string,
                    team: metadata?.team as string,
                    teamAbbr: extractTeamAbbr(metadata?.team as string),
                    position: metadata?.position as string,
                    imageUrl: metadata?.imageUrl as string,
                    stats: currentStats,
                    similarity: similarity // Keep for logging, remove before sending to client
                };
            })
        );

        console.log('Top similar players:', topSimilarPlayers.map(p =>
            `${p.name}: ${(p.similarity * 100).toFixed(1)}%`
        ));

        // Remove similarity score from response (keep it internal)
        const result = topSimilarPlayers.map(({ similarity, ...player }) => player);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Pinecone Similarity API Error:', error);
        return NextResponse.json({
            error: 'Failed to find similar players'
        }, { status: 500 });
    }
}

// Helper function to get current player stats
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
                // Calculate season averages
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

    const teamMappings: { [key: string]: string } = {
        'Los Angeles Lakers': 'LAL',
        'Golden State Warriors': 'GSW',
        'Boston Celtics': 'BOS',
        'Miami Heat': 'MIA',
        'Brooklyn Nets': 'BKN',
        'New York Knicks': 'NYK',
        'Philadelphia 76ers': 'PHI',
        'Toronto Raptors': 'TOR',
        'Chicago Bulls': 'CHI',
        'Cleveland Cavaliers': 'CLE',
        'Detroit Pistons': 'DET',
        'Indiana Pacers': 'IND',
        'Milwaukee Bucks': 'MIL',
        'Atlanta Hawks': 'ATL',
        'Charlotte Hornets': 'CHA',
        'Orlando Magic': 'ORL',
        'Washington Wizards': 'WAS',
        'Denver Nuggets': 'DEN',
        'Minnesota Timberwolves': 'MIN',
        'Oklahoma City Thunder': 'OKC',
        'Portland Trail Blazers': 'POR',
        'Utah Jazz': 'UTA',
        'Dallas Mavericks': 'DAL',
        'Houston Rockets': 'HOU',
        'Memphis Grizzlies': 'MEM',
        'New Orleans Pelicans': 'NOP',
        'San Antonio Spurs': 'SAS',
        'Phoenix Suns': 'PHX',
        'Los Angeles Clippers': 'LAC',
        'Sacramento Kings': 'SAC',
        'Free Agent': 'FA'
    };

    return teamMappings[teamName] || teamName.split(' ').map(word => word[0]).join('').toUpperCase();
}