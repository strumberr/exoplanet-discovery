'use client'

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'

export default function Home() {
    const pixiContainer = useRef(null)
    const appRef = useRef(null) // To store the PIXI.Application instance
    const [exoplanets, setExoplanets] = useState([])

    // Fetch exoplanets based on visible grid area (viewport)
    const fetchExoplanets = async (x1, y1, x2, y2) => {
        try {
            const response = await fetch('/api/exoplanets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ x1, y1, x2, y2 }), // Send the visible grid area to the server
            })
            const data = await response.json()
            setExoplanets(data)
        } catch (error) {
            console.error('Error fetching exoplanets:', error)
        }
    }

    useEffect(() => {
        // Initialize PixiJS app to fit the entire window
        const app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x000000,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        })

        // Save the application instance in the ref
        appRef.current = app
        pixiContainer.current.appendChild(app.view)

        // Create a container for all interactive elements (exoplanets)
        const container = new PIXI.Container()
        app.stage.addChild(container)

        // Center the container to start at (0,0), representing Earth’s position
        container.position.set(app.renderer.width / 2, app.renderer.height / 2)

        // Variables for panning and zooming
        let isDragging = false
        let dragStartX = 0
        let dragStartY = 0
        let zoom = 10 // Start zoomed in (set to 5 for a 50x50 visible area)

        // Function to fetch exoplanets based on the current viewable area
        const fetchVisibleExoplanets = () => {
            const x1 = -container.position.x / zoom
            const y1 = -container.position.y / zoom
            const x2 = (app.screen.width - container.position.x) / zoom
            const y2 = (app.screen.height - container.position.y) / zoom
            // Add extra padding around the viewport
            const padding = 100
            // log with padding
            console.log('fetching exoplanets', x1 - padding, y1 - padding, x2 + padding, y2 + padding)
            fetchExoplanets(x1 - padding, y1 - padding, x2 + padding, y2 + padding)
        }

        // Enable interactivity and panning
        app.stage.interactive = true
        app.stage.hitArea = app.screen
        app.stage.cursor = 'grab'

        app.stage.on('pointerdown', (event) => {
            isDragging = true
            const position = event.data.global
            dragStartX = position.x - container.position.x
            dragStartY = position.y - container.position.y
            app.stage.cursor = 'grabbing'
        })

        app.stage.on('pointerup', () => {
            isDragging = false
            app.stage.cursor = 'grab'
            fetchVisibleExoplanets() // Fetch exoplanets for the new area after panning
        })

        app.stage.on('pointerupoutside', () => {
            isDragging = false
            app.stage.cursor = 'grab'
            fetchVisibleExoplanets() // Fetch exoplanets for the new area after panning
        })

        app.stage.on('pointermove', (event) => {
            if (isDragging) {
                const newPosition = event.data.global
                container.position.x = newPosition.x - dragStartX
                container.position.y = newPosition.y - dragStartY
            }
        })

        // Zoom in and out
        // app.view.addEventListener('wheel', (event) => {
        //     // Get the position of the mouse relative to the container
        //     const mouseX = event.clientX;
        //     const mouseY = event.clientY;
        
        //     // Convert mouse coordinates to container coordinates
        //     const containerMouseX = (mouseX - container.position.x) / container.scale.x;
        //     const containerMouseY = (mouseY - container.position.y) / container.scale.y;
        
        //     // Determine zoom factor
        //     const zoomAmount = event.deltaY > 0 ? 0.9 : 1.1;
        //     zoom *= zoomAmount;
        //     zoom = Math.min(Math.max(zoom, 0.5), 10); // Set a limit on zoom range
        
        //     // Scale the container
        //     container.scale.set(zoom, zoom);
        
        //     // Adjust the container's position to zoom toward the cursor
        //     container.position.x = mouseX - containerMouseX * container.scale.x;
        //     container.position.y = mouseY - containerMouseY * container.scale.y;
        
        //     // Fetch exoplanets for the new zoom level
        //     fetchVisibleExoplanets();
        // });
        
        // Adjust canvas size on window resize
        window.addEventListener('resize', () => {
            app.renderer.resize(window.innerWidth, window.innerHeight)
            fetchVisibleExoplanets()
        })

        // Initial fetch when the component mounts
        fetchVisibleExoplanets()

        return () => {
            app.destroy(true, true)
            window.removeEventListener('resize', fetchVisibleExoplanets)
        }
    }, [])

    // Function to calculate gradient color
    // Function to calculate color using a modern palette (Viridis-like)
    const calculateColor = (value, min, max) => {
        const palette = ['#B3E5FC', '#81D4FA', '#4FC3F7', '#FFD180', '#FFAB91'] // Pale, modern colors
        const ratio = (value - min) / (max - min) // Normalize value between 0 and 1
        const index = Math.floor(ratio * (palette.length - 1)) // Choose color index based on ratio
        return PIXI.utils.string2hex(palette[index]) // Convert the color string to hex for PIXI
    }


    useEffect(() => {
        if (exoplanets.length === 0) return

        const app = appRef.current
        const container = app.stage.children[0] // Access the main container

        // Remove previous exoplanets before rendering new ones
        container.removeChildren()

        // Find the smallest and largest exoplanet by radius
        const minRadius = Math.min(...exoplanets.map((exo) => exo.pl_rade))
        const maxRadius = Math.max(...exoplanets.map((exo) => exo.pl_rade))

        // Variables for scaling exoplanet size (based on radius)
        const basePlanetSize = 10

        // Plot exoplanets based on their 2D coordinates and radius
        exoplanets.forEach((exo) => {
            const exoGraphics = new PIXI.Graphics()
            const exoSize = exo.pl_rade * basePlanetSize

            // Calculate the color based on radius (gradient from blue to red)
            const color = calculateColor(exo.pl_rade, minRadius, maxRadius)

            // Add shadow by drawing a slightly larger dark circle behind the exoplanet
            const shadow = new PIXI.Graphics()
            shadow.beginFill(0x000000, 0.5) // Semi-transparent black shadow
            shadow.drawCircle(-3, -3, exoSize + 5) // Slightly larger than the planet
            shadow.endFill()

            // Offset the shadow slightly to simulate depth
            shadow.x = exo.coordinates_2d_x * 10 + 3 // Offset by 3 pixels for a shadow effect
            shadow.y = exo.coordinates_2d_y * 10 + 3

            // Draw each exoplanet as a circle with a gradient color
            exoGraphics.beginFill(color) // Fill with calculated color
            exoGraphics.drawCircle(0, 0, exoSize)
            exoGraphics.endFill()

            // Position the exoplanet based on 2D coordinates (Earth is at (0,0))
            exoGraphics.x = exo.coordinates_2d_x * 10
            exoGraphics.y = exo.coordinates_2d_y * 10

            // Add hover info for exoplanets
            const infoText = new PIXI.Text(`${exo.pl_name}\nDiameter: ${(exo.pl_rade * 6371) * 2} Km.`, {
                fill: 'white',
                fontSize: 14,
            })
            infoText.visible = false
            infoText.x = exoGraphics.x - exoSize - 50
            infoText.y = exoGraphics.y - exoSize - 50

            exoGraphics.interactive = true
            exoGraphics.buttonMode = true

            exoGraphics.on('pointerover', () => {
                infoText.visible = true
                // border color #FF6A6A
                exoGraphics.lineStyle(2, 0xFF6A6A)
                exoGraphics.drawCircle(0, 0, exoSize)
                exoGraphics.endFill()
            })
            exoGraphics.on('pointerout', () => {
                infoText.visible = false
                exoGraphics.lineStyle(2, 0x000000)
                exoGraphics.drawCircle(0, 0, exoSize)
                exoGraphics.endFill()

            })

            // Add shadow, exoplanet, and info text to container
            container.addChild(shadow)      // Add the shadow first, so it's behind the planet
            container.addChild(exoGraphics) // Add the exoplanet on top of the shadow
            container.addChild(infoText)
        })
    }, [exoplanets])

    return (
        <div>
            <h1 style={{ textAlign: 'center', color: 'white' }}>
                Interactive Exoplanet Explorer
            </h1>
            <div
                ref={pixiContainer}
                style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
            />
        </div>
    )
}
