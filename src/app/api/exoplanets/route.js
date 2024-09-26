import { createClient } from 'redis'
import { NextResponse } from 'next/server'

// Function to initialize Redis client
async function getRedisClient() {
    const client = createClient({
        url: 'redis://10.237.17.105:6379',
    })

    // Handle connection events
    client.on('connect', () => {
        console.log('Redis connection successful')
    })

    client.on('error', (err) => {
        console.error('Redis Client Error:', err)
    })

    // Try to connect to Redis
    try {
        await client.connect()
        console.log('Connected to Redis')
    } catch (error) {
        console.error('Failed to connect to Redis:', error)
        throw new Error('Redis connection failed')
    }

    return client
}

export async function POST(request) {
    const client = await getRedisClient() // Initialize Redis client
    try {
        const { x1, x2, y1, y2 } = await request.json()

        // Convert the boundaries to floats
        const xMin = parseFloat(x1)
        const xMax = parseFloat(x2)
        const yMin = parseFloat(y1)
        const yMax = parseFloat(y2)

        console.log('Received viewport boundaries:', xMin, xMax, yMin, yMax)

        // Function to retrieve all exoplanet keys
        const getAllExoplanets = async () => {
            console.log('Getting all exoplanet keys')
            try {
                const keys = await client.keys('exoplanet:*')
                return keys
            } catch (err) {
                console.error('Error retrieving keys from Redis:', err)
                throw err
            }
        }

        // Function to get exoplanet details by key
        const getExoplanetData = async (key) => {
            try {
                const data = await client.hGetAll(key) // Use the promise-based hGetAll
                return data
            } catch (err) {
                console.error(
                    'Error retrieving exoplanet data from Redis:',
                    err
                )
                throw err
            }
        }

        // Get all exoplanet keys from Redis
        const keys = await getAllExoplanets()
        console.log('keys:', keys)

        // Retrieve exoplanet details for each key and filter them based on coordinates
        const exoplanets = []
        for (const key of keys) {
            if (exoplanets.length >= 200) break // Limit to 200 exoplanets

            const exoplanet = await getExoplanetData(key)

            // Parse the coordinates from the exoplanet data
            const x = parseFloat(exoplanet.X)
            const y = parseFloat(exoplanet.Y)

            // Check if the exoplanet coordinates are within the viewport boundaries
            if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                // Assign an incremental ID for the result set (optional)
                const id = keys.indexOf(key) + 1

                // Push the formatted exoplanet data into the result array
                exoplanets.push({
                    id: id,
                    pl_name: exoplanet.pl_name,
                    hostname: exoplanet.hostname,
                    discoverymethod: exoplanet.discoverymethod,
                    disc_year: parseFloat(exoplanet.disc_year),
                    pl_orbper: parseFloat(exoplanet.pl_orbper),
                    pl_rade: parseFloat(exoplanet.pl_rade),
                    pl_masse: exoplanet.pl_masse
                        ? parseFloat(exoplanet.pl_masse)
                        : null,
                    pl_dens: exoplanet.pl_dens
                        ? parseFloat(exoplanet.pl_dens)
                        : null,
                    pl_eqt: parseFloat(exoplanet.pl_eqt),
                    sy_dist: parseFloat(exoplanet.sy_dist),
                    coordinates_2d_x: x,
                    coordinates_2d_y: y,
                    temperature: parseFloat(exoplanet.temperature),
                })
            }
        }

        // Check if there are no results
        if (exoplanets.length === 0) {
            return NextResponse.json([{ name: '...', entity_type: '...' }], {
                status: 200,
            })
        }

        // Return the filtered exoplanets
        return NextResponse.json(exoplanets, { status: 200 })
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
