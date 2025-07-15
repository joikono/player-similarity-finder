// Usage: npm run setup-pinecone OR node scripts/setup-pinecone.js (ONLY ONCE)

const { Pinecone } = require('@pinecone-database/pinecone');

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
                stats: player.stats
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

// Helper function to fetch all players with stats
async function fetchAllPlayers() {
    const allPlayers = [];

    // Fetch multiple pages of players
    for (let page = 1; page <= 10; page++) {
        try {
            const response = await fetch(
                `https://www.balldontlie.io/api/v1/players?per_page=100&page=${page}`
            );
            const data = await response.json();

            // Get stats for each player
            for (const player of data.data) {
                const statsResponse = await fetch(
                    `https://www.balldontlie.io/api/v1/season_averages?season=2024&player_ids[]=${player.id}`
                );
                const statsData = await statsResponse.json();
                const stats = statsData.data[0];

                if (stats && stats.pts > 0) {
                    allPlayers.push({
                        id: player.id,
                        name: `${player.first_name} ${player.last_name}`,
                        team: player.team.full_name,
                        position: player.position,
                        imageUrl: `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`,
                        stats: {
                            points: stats.pts || 0,
                            assists: stats.ast || 0,
                            rebounds: stats.reb || 0,
                            steals: stats.stl || 0,
                            blocks: stats.blk || 0,
                            turnovers: stats.turnover || 0,
                            fieldGoalPercentage: stats.fg_pct || 0,
                            threePointPercentage: stats.fg3_pct || 0,
                            freeThrowPercentage: stats.ft_pct || 0,
                        }
                    });
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 50));
            }

        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
        }
    }

    return allPlayers;
}

// Helper function to normalize and vectorize stats
function normalizeAndVectorize(stats) {
    // Simple normalization (you'd want to use global min/max in production)
    return [
        Math.min(stats.points / 40, 1),           // Max ~40 PPG
        Math.min(stats.assists / 15, 1),          // Max ~15 APG
        Math.min(stats.rebounds / 20, 1),         // Max ~20 RPG
        Math.min(stats.steals / 4, 1),            // Max ~4 SPG
        Math.min(stats.blocks / 4, 1),            // Max ~4 BPG
        Math.min(stats.turnovers / 6, 1),         // Max ~6 TPG
        stats.fieldGoalPercentage,                // Already 0-1
        stats.threePointPercentage,               // Already 0-1
        stats.freeThrowPercentage                 // Already 0-1
    ];
}

// Run the setup
if (require.main === module) {
    setupPinecone();
}

module.exports = { setupPinecone };