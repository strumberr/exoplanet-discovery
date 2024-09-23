import sql from '../../db'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { x1, x2, y1, y2 } = await request.json()

        // if (!xBoundary || xBoundary.length < 2) {
        //     return NextResponse.json([{ name: '...', entity_type: '...' }], {
        //         status: 200,
        //     })
        // }

        // the coordinates above are the boundaries of the viewport
        const combinedData = await sql`
    SELECT 
        id,
        pl_name,
        hostname,
        discoverymethod,
        disc_year,
        pl_orbper,
        pl_rade,
        pl_masse,
        pl_dens,
        pl_eqt,
        sy_dist,
        coordinates_2d_x,
        coordinates_2d_y,
        temperature
    FROM exoplanets
    WHERE coordinates_2d_x >= ${x1} AND coordinates_2d_x <= ${x2} AND coordinates_2d_y >= ${y1} AND coordinates_2d_y <= ${y2}
`

        if (combinedData.length === 0) {
            return NextResponse.json([{ name: '...', entity_type: '...' }], {
                status: 200,
            })
        }

        return NextResponse.json(combinedData, { status: 200 })
    } catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json(
            { error: 'Error processing request' },
            { status: 500 }
        )
    }
}
