import sql from '../../../db'
import { NextResponse } from 'next/server'

// Function to handle signup API
export async function POST(req) {
    try {
        const { username, password } = await req.json()

        // Validate the input
        if (!username || !password) {
            return NextResponse.json(
                { message: 'Username and password are required' },
                { status: 400 }
            )
        }

        // Check if the username already exists
        const userCheckQuery = await sql`
            SELECT * FROM users WHERE username = ${username}
        `
        if (userCheckQuery.count > 0) {
            return NextResponse.json(
                { message: 'Username already exists' },
                { status: 400 }
            )
        }

        // Insert new user into the PostgreSQL database
        try {
            await sql`
                INSERT INTO users (username, password) VALUES (${username}, ${password})
            `
            return NextResponse.json(
                { message: 'User registered successfully' },
                { status: 200 }
            )
        } catch (error) {
            console.error('Database insertion error:', error)
            return NextResponse.json(
                { error: 'Error inserting user' },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json(
            { error: 'Error processing request' },
            { status: 500 }
        )
    }
}
