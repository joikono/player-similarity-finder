import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
    if (!pineconeClient) {
        if (!process.env.PINECONE_API_KEY) {
            throw new Error('PINECONE_API_KEY environment variable is required');
        }

        pineconeClient = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
    }

    return pineconeClient;
}

export function getPineconeIndex() {
    const pinecone = getPineconeClient();
    return pinecone.index('nba-players');
}

// Helper function to create embeddings from player name for search
export function createSearchVector(searchTerm: string): number[] {
    // For now, we'll use a simple approach - in production you'd want 
    // to use an embedding model or search by player name in metadata
    // This is a placeholder that returns a zero vector
    return new Array(9).fill(0);
}

// Type definitions for better TypeScript support
export interface PineconeMatch {
    id: string;
    score: number;
    metadata: {
        name: string;
        team: string;
        position: string;
        imageUrl: string;
    };
}

export interface SimilaritySearchResult {
    id: number;
    name: string;
    team: string;
    position: string;
    imageUrl: string;
    similarity: number;
}