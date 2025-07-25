// Usage: npm run setup-pinecone OR node scripts/setup-pinecone.js (ONLY ONCE)

require('dotenv').config(); // use dotenv to load .env

const { Pinecone } = require('@pinecone-database/pinecone');

var maxValues = {};

async function setupPinecone() {
    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
    });

    const indexName = 'nba-players';

    try {
        // Check if index exists
        const indexList = await pinecone.listIndexes();
        const indexExists = indexList.indexes.some(index => index.name === indexName);

        if (!indexExists) {
            console.log('Creating Pinecone index...');
            await pinecone.createIndex({
                name: indexName,
                dimension: 9, // 9 stats dimensions
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            console.log('Index created successfully!');

            // Wait for index to be ready
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        const index = pinecone.index(indexName);

        // Fetch NBA players and their stats
        console.log('Fetching NBA players...');
        const players = await fetchAllPlayers();
        console.log(`Found ${players.length} players with stats`);

        maxValues = {
            points: Math.max(...players.map(p => p.stats.points)),
            assists: Math.max(...players.map(p => p.stats.assists)),
            rebounds: Math.max(...players.map(p => p.stats.rebounds)),
            steals: Math.max(...players.map(p => p.stats.steals)),
            blocks: Math.max(...players.map(p => p.stats.blocks)),
            turnovers: Math.max(...players.map(p => p.stats.turnovers)),
            fieldGoalPercentage: Math.max(...players.map(p => p.stats.fieldGoalPercentage)),
            threePointPercentage: Math.max(...players.map(p => p.stats.threePointPercentage)),
            freeThrowPercentage: Math.max(...players.map(p => p.stats.freeThrowPercentage))
        }

        console.log("Maximum values:", maxValues)

        writeMaxValuesToFile(maxValues);

        // Convert to vectors and upsert to Pinecone
        console.log('Converting to vectors and uploading to Pinecone...');
        const vectors = players.map(player => ({
            id: player.id.toString(),
            values: normalizeAndVectorize(player.stats),
            metadata: {
                name: player.name,
                team: player.team,
                position: player.position,
                imageUrl: player.imageUrl,
            }
        }));

        // Upsert in batches
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
            console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
        }

        console.log('✅ Pinecone setup complete!');

    } catch (error) {
        console.error('❌ Error setting up Pinecone:', error);
    }
}

// Helper function to fetch all players 
async function fetchAllPlayers() {
    const allPlayers = [];
    // let a = 1; // for player indexing checks
    try {
        // Use the same working API call from your route.ts
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

        const data = await response.json();
        const players = data.resultSets[0].rowSet;

        // Get active players only (first 20 for testing to avoid rate limits)
        const activePlayers = players
            .filter(player => player[3] === 1) // Active status
            .slice(0, 20); // Start small for testing

        console.log(`Processing ${activePlayers.length} active players...`);

        // Get stats for each player (copied from your route.ts logic)
        for (const player of activePlayers) {
            const playerId = player[0];
            const playerName = player[2];
            const teamName = player[10] || 'Free Agent';
            const teamAbbr = player[11] || 'FA';

            console.log(`Getting stats for ${playerName} (ID: ${playerId})`);

            try {
                // Get player's game log for current season (same as route.ts)
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
                        // Calculate season averages (same logic as route.ts)
                        
                        // CHECK for player stat indexing
                        // if (a == 1) {
                        //     // check stat indexing
                        //     console.log(`Sample game data for ${playerName}:`);
                        //     games[2].forEach((value, index) => { // to verify 3p% index
                        //         console.log(`Index ${index}: ${value}`);
                        //     });
                        //     console.log(`Game array length:`, games[0].length);
                        //     a++;
                        // }

                        const totals = games.reduce((acc, game) => {
                            if (!game || game.length < 25) return acc;

                            return {
                                points: acc.points + (Number(game[24]) || 0),
                                rebounds: acc.rebounds + (Number(game[18]) || 0),
                                assists: acc.assists + (Number(game[19]) || 0),
                                steals: acc.steals + (Number(game[20]) || 0),
                                blocks: acc.blocks + (Number(game[21]) || 0),
                                turnovers: acc.turnovers + (Number(game[22]) || 0),
                                fieldGoalPercentage: acc.fieldGoalPercentage + (Number(game[9]) || 0),
                                threePointPercentage: acc.threePointPercentage + (Number(game[12]) || 0),
                                freeThrowPercentage: acc.freeThrowPercentage + (Number(game[15]) || 0),
                                games: acc.games + 1
                            };
                        }, { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, games: 0, 
                            fieldGoalPercentage: 0, threePointPercentage: 0, freeThrowPercentage: 0});

                        if (totals.games > 0) {
                            console.log(`${playerName}: ${totals.games} games, ${(totals.points / totals.games).toFixed(1)} PPG`);

                            // ADD THIS LOGGING BLOCK HERE:
                            const finalStats = {
                                points: totals.points / totals.games,
                                rebounds: totals.rebounds / totals.games,
                                assists: totals.assists / totals.games,
                                steals: totals.steals / totals.games,
                                blocks: totals.blocks / totals.games,
                                turnovers: totals.turnovers / totals.games,
                                fieldGoalPercentage: totals.fieldGoalPercentage / totals.games,
                                threePointPercentage: totals.threePointPercentage / totals.games,
                                freeThrowPercentage: totals.freeThrowPercentage / totals.games
                            };

                            // Log the percentages for the first player
                            if (allPlayers.length === 0) {
                                console.log('=== DEBUGGING FIRST PLAYER PERCENTAGES ===');
                                console.log('Raw totals:', totals);
                                console.log('Final stats:', finalStats);
                                console.log('FG%:', finalStats.fieldGoalPercentage);
                                console.log('3P%:', finalStats.threePointPercentage);
                                console.log('FT%:', finalStats.freeThrowPercentage);
                                console.log('=== END DEBUG ===');
                            }


                            allPlayers.push({
                                id: playerId,
                                name: playerName,
                                team: teamName,
                                position: 'Player',
                                imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`,
                                stats: {
                                    points: totals.points / totals.games,
                                    rebounds: totals.rebounds / totals.games,
                                    assists: totals.assists / totals.games,
                                    steals: totals.steals / totals.games,
                                    blocks: totals.blocks / totals.games,
                                    turnovers: totals.turnovers / totals.games,
                                    fieldGoalPercentage: totals.fieldGoalPercentage / totals.games,
                                    threePointPercentage: totals.threePointPercentage / totals.games,
                                    freeThrowPercentage: totals.freeThrowPercentage / totals.games
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.log(`Failed to get stats for ${playerName}:`, error);
            }

            // Rate limiting to avoid hitting API too hard
            await new Promise(resolve => setTimeout(resolve, 200));
        }

    } catch (error) {
        console.error('Error fetching players:', error);
    }

    return allPlayers;
}

// Helper function to normalize and vectorize stats
function normalizeAndVectorize(stats) {
    // Simple normalization (you'd want to use global min/max in production)
    return [
        Math.min(stats.points / maxValues.points, 1),           // Max ~40 PPG
        Math.min(stats.assists / maxValues.assists, 1),          // Max ~15 APG
        Math.min(stats.rebounds / maxValues.rebounds, 1),         // Max ~20 RPG
        Math.min(stats.steals / maxValues.steals, 1),            // Max ~4 SPG
        Math.min(stats.blocks / maxValues.blocks, 1),            // Max ~4 BPG
        Math.min(stats.turnovers / maxValues.turnovers, 1),         // Max ~6 TPG
        stats.fieldGoalPercentage,                // Already 0-1
        stats.threePointPercentage,               // Already 0-1
        stats.freeThrowPercentage                 // Already 0-1
    ];
}

// write max values to normalization.ts
function writeMaxValuesToFile(maxValues) {
    const fs = require('fs');
    const path = require('path');

    const filePath = path.join(__dirname, '..', 'src', 'lib', 'normalization.ts');

    const fileContent = `// This file is auto-generated by setup-pinecone.js
        // Do not edit manually - run 'npm run setup-pinecone' to update

        export interface MaxValues {
        points: number;
        assists: number;
        rebounds: number;
        steals: number;
        blocks: number;
        turnovers: number;
        }

        export interface PlayerStats {
        points: number;
        rebounds: number;
        assists: number;
        steals: number;
        blocks: number;
        turnovers: number;
        fieldGoalPercentage: number;
        threePointPercentage: number;
        freeThrowPercentage: number;
        }

        // Auto-generated max values from dataset
        export const MAX_VALUES: MaxValues = {
        points: ${maxValues.points},
        assists: ${maxValues.assists},
        rebounds: ${maxValues.rebounds},
        steals: ${maxValues.steals},
        blocks: ${maxValues.blocks},
        turnovers: ${maxValues.turnovers},
        };

        // Normalization function
        export function normalizeAndVectorize(stats: PlayerStats): number[] {
        return [
            Math.min(stats.points / MAX_VALUES.points, 1),
            Math.min(stats.assists / MAX_VALUES.assists, 1),
            Math.min(stats.rebounds / MAX_VALUES.rebounds, 1),
            Math.min(stats.steals / MAX_VALUES.steals, 1),
            Math.min(stats.blocks / MAX_VALUES.blocks, 1),
            Math.min(stats.turnovers / MAX_VALUES.turnovers, 1),
            stats.fieldGoalPercentage,
            stats.threePointPercentage,
            stats.freeThrowPercentage
        ];
        }
    `;

    fs.writeFileSync(filePath, fileContent);
    console.log('✅ Max values written to normalization.ts');
}

// Run the setup
if (require.main === module) {
    setupPinecone();
}

module.exports = { setupPinecone };