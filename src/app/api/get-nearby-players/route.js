import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Function to initialize Redis client
async function getRedisClient() {
    const client = createClient({
        url: 'redis://10.237.17.105:6379',
    })

    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    try {
        await client.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw new Error('Redis connection failed');
    }

    return client;
}

// Calculate distance between two grid points (Pythagorean theorem)
const calculateDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export async function POST(request) {
    const client = await getRedisClient();  // Initialize Redis client
    try {
        const { x, y, userId } = await request.json();

        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }

        const userIdString = userId.toString();
        const USER_KEY = `user:${userIdString}`; // Redis key for the current user

        // Get all user locations stored in Redis
        const userKeys = await client.keys('user:*');
        const nearbyUsers = [];

        // Define the maximum distance for considering users "nearby" (e.g., 10 grid units)
        const maxDistance = 200;

        // Loop through all users to calculate distance
        for (const key of userKeys) {
            if (key === USER_KEY) continue; // Skip the current user

            const userCoords = await client.hGetAll(key);
            const userX = parseFloat(userCoords.x);
            const userY = parseFloat(userCoords.y);

            const distance = calculateDistance(x, y, userX, userY);
            if (distance <= maxDistance) {
                nearbyUsers.push({
                    userId: key.replace('user:', ''),
                    coordinates: { x: userX, y: userY },
                    distance: distance,
                });
            }
        }

        // Return the filtered nearby users
        return NextResponse.json(nearbyUsers, { status: 200 });
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: 'Error processing request' },
            { status: 500 }
        );
    } finally {
        await client.quit();  // Always close the Redis client when done
    }
}
