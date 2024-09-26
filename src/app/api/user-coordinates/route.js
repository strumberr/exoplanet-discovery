import { createClient } from 'redis'
import { NextResponse } from 'next/server'

async function getRedisClient() {
    const client = createClient({
        url: `redis://${process.env.REDIS_URL}:6379`,
    });

    client.on('error', (err) => {
        console.error('Redis Client Error:', err)
    })

    await client.connect();
    return client;
}

// Calculate composite score for ZSET
const generateCompositeScore = (x, y, scaleFactor = 100000) => {
    return (x * scaleFactor) + y;
};

// Decompose composite score back into X and Y
const decomposeScore = (score, scaleFactor = 100000) => {
    const x = Math.floor(score / scaleFactor);
    const y = score % scaleFactor;
    return { x, y };
};

// Calculate distance between two grid points
const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export async function POST(request) {
    const client = await getRedisClient();
    try {
        const { x, y, userId } = await request.json()

        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers')
        }

        const userIdString = userId.toString();
        const USER_KEY = `user:${userIdString}`;
        const score = generateCompositeScore(x, y);

        // Insert user coordinates as a ZSET entry
        await client.zAdd('users_coords', { score, value: USER_KEY });

        // Get nearby users
        const searchRadius = 200;
        const minScore = generateCompositeScore(x - searchRadius, y - searchRadius);
        const maxScore = generateCompositeScore(x + searchRadius, y + searchRadius);
        const nearbyUserKeys = await client.zRangeByScore('users_coords', minScore, maxScore);

        const nearbyUsers = [];
        for (const key of nearbyUserKeys) {
            if (key === USER_KEY) continue;

            const userScore = await client.zScore('users_coords', key);
            const { x: otherUserX, y: otherUserY } = decomposeScore(userScore);

            const distance = calculateDistance(x, y, otherUserX, otherUserY);
            if (distance <= searchRadius) {
                nearbyUsers.push({
                    userId: key.replace('user:', ''),
                    coordinates: { x: otherUserX, y: otherUserY },
                    distance: distance
                });
            }
        }

        // Fetch troop data for the current user
        const TROOP_KEY = `troops:${userIdString}`;
        const troopsRawData = await client.hGetAll(TROOP_KEY);

        const troops = Object.keys(troopsRawData)
            .filter(key => key !== 'count')  // Exclude the troop count field
            .map(key => JSON.parse(troopsRawData[key]));

        // Send the nearby users and troops back as a JSON response
        return NextResponse.json({ nearbyUsers, troops }, { status: 200 });
    } catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json(
            { error: 'Error processing request' },
            { status: 500 }
        )
    } finally {
        await client.quit() // Always close the Redis client when done
    }
}
