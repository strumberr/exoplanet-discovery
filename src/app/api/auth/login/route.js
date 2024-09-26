// /pages/api/auth/login.js
import sql from '../../../db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default-secret-key'

export async function POST(req) {
    try {
        const { username, password } = await req.json()

        // Find the user in the database
        const user = await sql`SELECT * FROM users WHERE username = ${username}`

        if (user.length === 0) {
            return NextResponse.json(
                { message: 'Invalid username or password' },
                { status: 401 }
            )
        }

        // Directly compare the provided password with the stored password
        if (password !== user[0].password) {
            return NextResponse.json(
                { message: 'Invalid username or password' },
                { status: 401 }
            )
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user[0].id }, SECRET_KEY, {
            expiresIn: '1h',
        })

        // Insert the token into the sessions table
        try {
            await sql`
                INSERT INTO sessions (user_id, token, created_at) VALUES (${user[0].id}, ${token}, NOW())
            `
        } catch (error) {
            console.error('Error inserting session:', error)
            return NextResponse.json(
                { message: 'Error creating session' },
                { status: 500 }
            )
        }

        // Return the token to the client
        return NextResponse.json({ token }, { status: 200 })
    } catch (error) {
        console.error('Error during login:', error)
        return NextResponse.json({ message: 'Login failed' }, { status: 500 })
    }
}

export async function handler(req) {
    if (req.method === 'POST') {
        return POST(req)
    } else {
        return NextResponse.json(
            { message: 'Method Not Allowed' },
            { status: 405 }
        )
    }
}
