'use client'

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import './styles.css'

export default function Home() {
    const pixiContainer = useRef(null)
    const appRef = useRef(null) // To store the PIXI.Application instance
    const [exoplanets, setExoplanets] = useState([])
    const infoBoxRef = useRef(null) // Ref for the info box container
    const [renderDistance, setRenderDistance] = useState(100)
    const [otherPlayers, setOtherPlayers] = useState([]) // State to store other players' coordinates
    const [userId, setUserId] = useState('') // State to store the user id
    const [cursorCoordinates, setCursorCoordinates] = useState({ x: 0, y: 0 }) // State to store the cursor coordinates
    const [loading, setLoading] = useState(true)

    let cursorCoordinatesSecond = useRef({ x: 0, y: 0 })

    // Set the user id in localStorage and get the user id
    useEffect(() => {
        const randomUserId = Math.floor(Math.random() * 1000000) // Generate a random user id

        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', `${randomUserId}`) // Default userId
        }
        setUserId(localStorage.getItem('userId'))
    }, [])

    // Fetch other players' coordinates from the API
    const fetchPlayerCoordinates = async (x, y) => {
        try {
            const response = await fetch('/api/user-coordinates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    x,
                    y,
                    userId: localStorage.getItem('userId'),
                }), // Send the current cursor coordinates
            })
            const data = await response.json()
            setOtherPlayers(data) // Store the returned player data
        } catch (error) {
            console.error('Error fetching player coordinates:', error)
        }
    }

    // Fetch exoplanets based on visible grid area (viewport)
    const fetchExoplanets = async (x1, y1, x2, y2) => {
        try {
            const response = await fetch(
                'http://10.237.17.105:3000/api/exoplanets2',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ x1, y1, x2, y2 }), // Send the visible grid area to the server
                }
            )
            const data = await response.json()
            if (data.length === 0) {
                console.log('No exoplanets found in this area')
                setExoplanets([]) // Set state to an empty array if no data
            } else {
                setExoplanets(data)
            }
        } catch (error) {
            console.error('Error fetching exoplanets:', error)
            setExoplanets([]) // In case of error, set state to an empty array
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

        // Create a container for all interactive elements (exoplanets and players)
        const container = new PIXI.Container()
        app.stage.addChild(container)

        // Center the container to start at (0,0), representing Earth’s position
        container.position.set(app.renderer.width / 2, app.renderer.height / 2)

        // Variables for panning and zooming
        let isDragging = false
        let dragStartX = 0
        let dragStartY = 0
        let zoom = 10

        // Function to fetch exoplanets and player coordinates based on the current viewable area
        const fetchVisibleExoplanetsAndPlayers = () => {
            const x1 = -container.position.x / zoom
            const y1 = -container.position.y / zoom
            const x2 = (app.screen.width - container.position.x) / zoom
            const y2 = (app.screen.height - container.position.y) / zoom
            const padding = renderDistance

            fetchExoplanets(
                x1 - padding,
                y1 - padding,
                x2 + padding,
                y2 + padding
            )
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
            fetchVisibleExoplanetsAndPlayers() // Fetch exoplanets and players for the new area after panning
        })

        app.stage.on('pointerupoutside', () => {
            isDragging = false
            app.stage.cursor = 'grab'
            fetchVisibleExoplanetsAndPlayers()
        })

        app.stage.on('pointermove', (event) => {
            if (isDragging) {
                const newPosition = event.data.global
                container.position.x = newPosition.x - dragStartX
                container.position.y = newPosition.y - dragStartY

                // cursorCoordinatesSecond = {
                //     x: (event.data.global.x - container.position.x) / zoom,
                //     y: (event.data.global.y - container.position.y) / zoom,
                // };
            }

            cursorCoordinatesSecond.x =
                (event.data.global.x - container.position.x) / zoom
            cursorCoordinatesSecond.y =
                (event.data.global.y - container.position.y) / zoom

            // console.log(cursorCoordinatesSecond.x, cursorCoordinatesSecond.y)
        })

        window.addEventListener('resize', () => {
            app.renderer.resize(window.innerWidth, window.innerHeight)
            fetchVisibleExoplanetsAndPlayers()
        })

        // Initial fetch when the component mounts
        fetchVisibleExoplanetsAndPlayers()

        return () => {
            app.destroy(true, true)
            window.removeEventListener(
                'resize',
                fetchVisibleExoplanetsAndPlayers
            )
        }
    }, [])

    // Separate useEffect to update user coordinates every 200ms
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchPlayerCoordinates(
                cursorCoordinatesSecond.x,
                cursorCoordinatesSecond.y
            ) // Send cursor coordinates to the API every 200ms
        }, 100) // 200ms interval for updates

        return () => clearInterval(intervalId) // Clean up the interval on component unmount
    }, [cursorCoordinatesSecond]) // Only run when cursorCoordinates change

    // Function to calculate gradient color
    const calculateColor = (value) => {
        const overallMin = 0.3
        const overallMax = 3800
        const bellCurveMin = 0
        const bellCurveMax = 30
        const mean = (bellCurveMin + bellCurveMax) / 2
        const stdDev = (bellCurveMax - bellCurveMin) / 6
        const palette = [
            '#B3E5FC',
            '#B3E2FC',
            '#B3DFFC',
            '#FCE3B3',
            '#FCDAB3',
            '#FCD1B3',
            '#FCC8B3',
            '#FCBFB3',
            '#FCB6B3',
            '#FCAEB3',
            '#FCA5B3',
            '#FC9CB3',
            '#FC93B3',
            '#FC8AB3',
            '#FC81B3',
            '#FC78B3',
            '#FC6FB3',
            '#FC66B3',
            '#FC5DB3',
            '#FC54B3',
        ]
        let ratio
        if (value >= bellCurveMin && value <= bellCurveMax) {
            ratio = Math.exp(-Math.pow(value - mean, 2) / (2 * stdDev * stdDev))
        } else {
            ratio = (value - overallMin) / (overallMax - overallMin)
        }
        const index = Math.floor(ratio * (palette.length - 1))
        return PIXI.utils.string2hex(palette[index])
    }

    useEffect(() => {
        const app = appRef.current
        const container = app.stage.children[0]

        // console.log('Rendering exoplanets:');

        // Remove previous exoplanets and players before rendering new ones
        container.removeChildren()

        // Draw Earth at (0,0)
        const earthGraphics = new PIXI.Graphics()
        const earthSize = 15 // Adjust size as needed for Earth
        earthGraphics.beginFill(0x0000ff) // Blue color for Earth
        earthGraphics.drawCircle(0, 0, earthSize) // Earth at (0,0)
        earthGraphics.endFill()
        container.addChild(earthGraphics)

        if (otherPlayers.length === 0) {
            // create a temporary player at (0,0) if no other players found
            otherPlayers.push({
                userId: '0',
                coordinates: { x: 0, y: 0 },
            })
        }

        try {
            // Draw other players as red dots
            otherPlayers.forEach((player) => {
                const playerGraphics = new PIXI.Graphics()
                playerGraphics.beginFill(0xff0000) // Red color for other players
                playerGraphics.drawCircle(0, 0, 10) // Draw a red dot for the player
                playerGraphics.endFill()

                // draw a bigger circle aorund the player
                playerGraphics.beginFill(0xff0000, 0.3)
                playerGraphics.drawCircle(0, 0, 50) // Draw a red dot for the player
                playerGraphics.endFill()

                // playerGraphics.lineStyle(2, 0xFF0000, 0.3);
                // // The rectangle is 1000 wide and 800 height, so we shift by half the width and height to center it
                // playerGraphics.drawRect(-550, -400, 1100, 800); // Center the rectangle around the player
                // playerGraphics.endFill();
                // add the player id right below the dot
                const playerText = new PIXI.Text(player.userId, {
                    fill: 'white',
                    fontSize: 12,
                })
                playerText.x = -10
                playerText.y = 20
                playerGraphics.addChild(playerText)

                // Position the player based on their grid coordinates (x, y)
                playerGraphics.x = player.coordinates.x * 10 // Adjust scale as needed
                playerGraphics.y = player.coordinates.y * 10 // Adjust scale as needed

                container.addChild(playerGraphics)
            })
        } catch (error) {
            console.log('Error rendering other players:', error)
        }

        // If no exoplanets found, display message
        if (exoplanets.length === 0) {
            const noExoplanetsText = new PIXI.Text(
                'No exoplanets found in this area',
                {
                    fill: 'white',
                    fontSize: 24,
                }
            )
            noExoplanetsText.x = app.screen.width / 2 - 150
            noExoplanetsText.y = app.screen.height / 2 - 20
            container.addChild(noExoplanetsText)
            return
        }

        const basePlanetSize = 10

        // Plot exoplanets based on their 2D coordinates and radius
        exoplanets.forEach((exo) => {
            const exoGraphics = new PIXI.Graphics()
            const exoSize = exo.pl_rade * basePlanetSize

            // Calculate the color based on radius
            const color = calculateColor(exo.pl_rade)

            // Draw each exoplanet as a circle with a gradient color
            exoGraphics.beginFill(color)
            exoGraphics.drawCircle(0, 0, exoSize)
            exoGraphics.endFill()

            // Position the exoplanet based on 2D coordinates
            exoGraphics.x = exo.coordinates_2d_x * 10
            exoGraphics.y = exo.coordinates_2d_y * 10

            // Add shadow by drawing a slightly larger dark circle behind the exoplanet
            const shadow = new PIXI.Graphics()
            shadow.beginFill(color, 0.3)
            shadow.drawCircle(-3, -3, exoSize + 5)
            // blur the shadow

            shadow.endFill()

            // Offset the shadow slightly to simulate depth
            shadow.x = exo.coordinates_2d_x * 10 + 3
            shadow.y = exo.coordinates_2d_y * 10 + 3

            // Make the exoplanet interactive and show info box on hover
            exoGraphics.interactive = true
            exoGraphics.buttonMode = true

            exoGraphics.on('pointerover', (event) => {
                const infoBox = infoBoxRef.current
                infoBox.style.display = 'block'
                infoBox.innerHTML = `
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Name:</div>
                        <div class='fieldValue'>${exo.pl_name}</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Diameter:</div>
                        <div class='fieldValue'>${(
                            exo.pl_rade *
                            6371 *
                            2
                        ).toFixed(2)} Km</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Temperature:</div>
                        <div class='fieldValue'>${(
                            exo.temperature - 273.15
                        ).toFixed(2)} °C</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Distance:</div>
                        <div class='fieldValue'>${(
                            exo.sy_dist * 3.26156
                        ).toFixed(2)} light years</div>
                    </div>
                `

                // Add hover border animation
                exoGraphics.lineStyle(2, 0xff6a6a) // Red border on hover
                exoGraphics.drawCircle(0, 0, exoSize)
                exoGraphics.endFill()

                // set cursor to pointer
                exoGraphics.cursor = 'pointer'
            })

            exoGraphics.on('pointermove', (event) => {
                const infoBox = infoBoxRef.current
                infoBox.style.left = `${event.data.global.x + 10}px`
                infoBox.style.top = `${event.data.global.y + 10}px`
            })

            exoGraphics.on('pointerout', () => {
                const infoBox = infoBoxRef.current
                infoBox.style.display = 'none'

                // Remove hover border animation
                exoGraphics.clear() // Clear the hover border
                exoGraphics.beginFill(color) // Redraw the planet without border
                exoGraphics.drawCircle(0, 0, exoSize)
                exoGraphics.endFill()

                // set cursor to default
                exoGraphics.cursor = 'default'
            })

            // Add the exoplanet to the container
            container.addChild(shadow)

            container.addChild(exoGraphics)
        })
    }, [exoplanets, otherPlayers]) // Re-render if either exoplanets or other players change

    return (
        <div>
            {/* Info Box Container */}
            <div ref={infoBoxRef} className="infoBoxWrapper"></div>

            {/* PixiJS Container */}
            <div
                ref={pixiContainer}
                style={{
                    width: '100vw',
                    height: '100vh',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            />

            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                {/* <p>({cursorCoordinatesSecond.x.toFixed(2)}, {cursorCoordinatesSecond.y.toFixed(2)})</p> */}
            </div>
        </div>
    )
}
