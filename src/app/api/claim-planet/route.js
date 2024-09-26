import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Function to initialize Redis client
async function getRedisClient() {
    const client = createClient({
        url: `redis://${process.env.URL}:6379`,
    });

    // Handle connection events
    client.on('connect', () => {
        console.log('Redis connection successful');
    });

    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    // Try to connect to Redis
    try {
        await client.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw new Error('Redis connection failed');
    }

    return client;
}


export async function POST(request) {
    const client = await getRedisClient();  // Initialize Redis client
    try {
        const { planetId, userId, x, y } = await request.json();

        if (!planetId || !userId) {
            return NextResponse.json({ error: 'planetId and userId are required' }, { status: 400 });
        }

        const PLANET_KEY = `exoplanet:${planetId}`; // Redis key for the specific planet

        // Check if the planet exists in Redis
        const planetExists = await client.exists(PLANET_KEY);
        if (!planetExists) {
            return NextResponse.json({
                error: 'Planet not found',
            }, { status: 404 });
        }

        // Check the current owner of the planet
        const currentOwner = await client.hGet(PLANET_KEY, 'owner');

        if (currentOwner && currentOwner !== '0') {
            // If there's already an owner, return the current owner's info
            return NextResponse.json({
                message: 'Planet already owned',
                owner: currentOwner
            }, { status: 400 });
        }

        // If no owner exists (owner is '0'), assign the user as the owner
        await client.hSet(PLANET_KEY, 'owner', userId);


        // get the coordinates of the planet
        const planetCoordinateX = await client.hGet(PLANET_KEY, 'X');
        const planetCoordinateY = await client.hGet(PLANET_KEY, 'Y');

        // get the coordinates of the user's troops
        const userCoordinate = await client.hGet(`troops:${userId}`, 'coordinates');
        const userCoordinateX = userCoordinate.split(',')[0];
        const userCoordinateY = userCoordinate.split(',')[1];

        // get the trooper count
        const userTroopCount = await client.hGet(`troops:${userId}`, 'count');


        // Return a success message
        return NextResponse.json({
            message: `User ${userId} is now the owner of planet ${planetId}`,
            coordinates: {
                x: planetCoordinateX,
                y: planetCoordinateY
            },
            userTroopCoordinates: {
                x: userCoordinateX,
                y: userCoordinateY,
                troopCount: userTroopCount
            }
        }, { status: 200 });
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
