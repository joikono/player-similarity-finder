import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('Testing NBA official stats API...');

        const response = await fetch(
            'https://stats.nba.com/stats/commonallplayers?LeagueID=00&Season=2024-25&IsOnlyCurrentSeason=1',
            {
                headers: {
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Host': 'stats.nba.com',
                    'Referer': 'https://www.nba.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        );

        console.log('NBA API Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Success! Got', data.resultSets?.[0]?.rowSet?.length, 'players');

            return NextResponse.json({
                success: true,
                status: response.status,
                playerCount: data.resultSets?.[0]?.rowSet?.length || 0,
                message: 'NBA Stats API is working!'
            });
        } else {
            return NextResponse.json({
                success: false,
                status: response.status,
                statusText: response.statusText
            });
        }

    } catch (error) {
        console.log('Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}