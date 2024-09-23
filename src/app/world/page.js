'use client'

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'

export default function Home() {
    const pixiContainer = useRef(null)
    const [planets, setPlanets] = useState([])
    const [exoplanets, setExoplanets] = useState([])

    const fetchExoplanets = async (x1, y1, x2, y2) => {
        try {
            const response = await fetch('/api/exoplanets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ x1, y1, x2, y2 }),
            })
            const data = await response.json()
            setExoplanets(data)
        } catch (error) {
            console.error('Error fetching exoplanets:', error)
        }
    }

    useEffect(() => {
        // Fetch planets data
        const fetchPlanets = async () => {
            const planetsData = [
                {
                    name: 'Mercury',
                    distance: 57900000,
                    diameter: 4879,
                    description: 'The smallest planet, closest to the Sun.',
                },
                {
                    name: 'Venus',
                    distance: 108200000,
                    diameter: 12104,
                    description:
                        'Second planet from the Sun with a thick atmosphere.',
                },
                {
                    name: 'Earth',
                    distance: 149600000,
                    diameter: 12742,
                    description: 'The only planet known to support life.',
                },
                {
                    name: 'Mars',
                    distance: 227900000,
                    diameter: 6779,
                    description: 'Known as the red planet.',
                },
                {
                    name: 'Jupiter',
                    distance: 778500000,
                    diameter: 139820,
                    description: 'The largest planet in our solar system.',
                },
                {
                    name: 'Saturn',
                    distance: 1434000000,
                    diameter: 116460,
                    description: 'Famous for its rings.',
                },
                {
                    name: 'Uranus',
                    distance: 2871000000,
                    diameter: 50724,
                    description: 'An ice giant with a unique tilt.',
                },
                {
                    name: 'Neptune',
                    distance: 4495000000,
                    diameter: 49244,
                    description: 'The farthest planet from the Sun.',
                },
            ]

            setPlanets(planetsData)
        }

        fetchPlanets()
    }, [])

    useEffect(() => {
        if (planets.length === 0) return

        // Initialize PixiJS app to fit entire window
        const app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x000000,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        })

        pixiContainer.current.appendChild(app.view)

        // Create a container for all interactive elements (planets, etc.)
        const container = new PIXI.Container()
        app.stage.addChild(container)

        // Center the container in the viewport
        container.position.set(app.renderer.width / 2, app.renderer.height / 2)

        // Enable interactivity with the entire PixiJS canvas (global panning)
        app.stage.interactive = true
        app.stage.hitArea = app.screen
        app.stage.cursor = 'grab'

        // Variables for panning
        let isDragging = false
        let dragStartX = 0
        let dragStartY = 0

        // Variables for scaling
        let zoom = 1

        // Calculate planet sizes relative to the largest (Jupiter)
        const maxDiameter = Math.max(...planets.map((p) => p.diameter))
        const baseSize = 100
        const scaleFactor = baseSize / maxDiameter

        // Create planets
        planets.forEach((planet, index) => {
            const planetGraphics = new PIXI.Graphics()
            const planetSize = planet.diameter * scaleFactor

            // Draw each planet
            planetGraphics.beginFill(0xffffff)
            planetGraphics.drawCircle(0, 0, planetSize)
            planetGraphics.endFill()

            const angle = (index / planets.length) * (2 * Math.PI)
            const orbitRadius = 1000
            planetGraphics.x = orbitRadius * Math.cos(angle)
            planetGraphics.y = orbitRadius * Math.sin(angle)

            const distanceText = new PIXI.Text(`${planet.distance} km`, {
                fill: 'white',
                fontSize: 16,
            })
            distanceText.visible = false
            distanceText.x = planetGraphics.x - 30
            distanceText.y = planetGraphics.y - 80

            planetGraphics.interactive = true
            planetGraphics.buttonMode = true

            planetGraphics.on('pointerover', () => {
                distanceText.visible = true
            })
            planetGraphics.on('pointerout', () => {
                distanceText.visible = false
            })

            planetGraphics.on('pointerdown', (event) => {
                event.stopPropagation()
                alert(
                    `${planet.name}\nDistance: ${planet.distance} km\n${planet.description}`
                )
            })

            container.addChild(planetGraphics)
            container.addChild(distanceText)
        })

        // Add exoplanets container
        const exoplanetContainer = new PIXI.Container()
        container.addChild(exoplanetContainer)

        const fetchVisibleExoplanets = () => {
            const x1 = -container.position.x / zoom
            const y1 = -container.position.y / zoom
            const x2 = (app.screen.width - container.position.x) / zoom
            const y2 = (app.screen.height - container.position.y) / zoom
            fetchExoplanets(x1, y1, x2, y2)
        }

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
            fetchVisibleExoplanets()
        })

        app.stage.on('pointerupoutside', () => {
            isDragging = false
            app.stage.cursor = 'grab'
            fetchVisibleExoplanets()
        })

        app.stage.on('pointermove', (event) => {
            if (isDragging) {
                const newPosition = event.data.global
                container.position.x = newPosition.x - dragStartX
                container.position.y = newPosition.y - dragStartY
            }
        })

        app.view.addEventListener('wheel', (event) => {
            const zoomAmount = event.deltaY > 0 ? 0.9 : 1.1
            zoom *= zoomAmount
            zoom = Math.min(Math.max(zoom, 0.3), 3)
            container.scale.set(zoom, zoom)
            fetchVisibleExoplanets()
        })

        window.addEventListener('resize', () => {
            app.renderer.resize(window.innerWidth, window.innerHeight)
            fetchVisibleExoplanets()
        })

        return () => {
            app.destroy(true, true)
            window.removeEventListener('resize', fetchVisibleExoplanets)
        }
    }, [planets])

    useEffect(() => {
        if (exoplanets.length === 0) return

        const app = pixiContainer.current._pixiApp // Assuming PIXI.Application instance is stored in ref
        const exoplanetContainer =
            app.stage.getChildByName('exoplanetContainer')
        if (!exoplanetContainer) return

        exoplanetContainer.removeChildren()

        exoplanets.forEach((exo) => {
            const exoGraphics = new PIXI.Graphics()
            const exoSize = exo.pl_rade * 2
            exoGraphics.beginFill(0x00ff00)
            exoGraphics.drawCircle(0, 0, exoSize)
            exoGraphics.endFill()
            exoGraphics.x = exo.coordinates_2d_x
            exoGraphics.y = exo.coordinates_2d_y

            exoplanetContainer.addChild(exoGraphics)
        })
    }, [exoplanets])

    return (
        <div>
            <h1 style={{ textAlign: 'center', color: 'white' }}>
                Interactive Planet Explorer
            </h1>
            <div
                ref={pixiContainer}
                style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
            />
        </div>
    )
}
