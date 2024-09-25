import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Function to initialize Redis client
async function getRedisClient() {
    const client = createClient({
        url: 'redis://localhost:6379',
    });

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

export async function POST(request) {
    const client = await getRedisClient();  // Initialize Redis client
    try {
        const { x, y, userId } = await request.json();

        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }

        const userIdString = userId.toString();
        const USER_KEY = `user:${userIdString}`; // Redis key for the current user

        // Store the user's coordinates using SET
        await client.hSet(USER_KEY, {
            x: x.toString(),
            y: y.toString(),
        });

        return NextResponse.json({ message: 'Coordinates updated successfully' }, { status: 200 });
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
