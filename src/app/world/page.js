'use client'

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import "./styles.css"
import { io } from 'socket.io-client';
import { throttle } from 'lodash';


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
    const [playerTroops, setPlayerTroops] = useState([])
    const [activateTroops, setActivateTroops] = useState(false)
    const [troopData, setTroopData] = useState(null)

    // const [claimPlanetModal, setClaimPlanetModal] = useState(false)

    const [isModalVisible, setModalVisible] = useState(false);
    const [planetToClaim, setPlanetToClaim] = useState(null);
    const [claimResult, setClaimResult] = useState(null); // For success/error message
    const [isClaiming, setIsClaiming] = useState(false); // Loading state for claim process
    const [nearbyPlayerWithTroops, setNearbyPlayerWithTroops] = useState([])

    let cursorCoordinatesSecond = useRef({ x: 0, y: 0 })
    let troopsCoordinates = useRef({ x: 0, y: 0 })
    

    // Create a ref for the socket connection
    const socketRef = useRef(null);

    // Set the user id in localStorage and get the user id
    useEffect(() => {
        const randomUserId = Math.floor(Math.random() * 1000000) // Generate a random user id
        
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', `${randomUserId}`) // Default userId
        }
        
        setUserId(localStorage.getItem('userId'));

        // console.log('User ID:', localStorage.getItem('userId'));

        let socketURL = `http://${process.env.NEXT_PUBLIC_SOCKET_URL}:5000`
        // Initialize Socket.IO client connection
        const socket = io(socketURL); // Replace with your server URL
        socketRef.current = socket; // Store socket instance

        // Handle connection
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        // Handle incoming player coordinates from the server
        socket.on('nearby_users', (data) => {
            // console.log('Received nearby users:', data);
            setOtherPlayers(data.nearbyUsers); // Update the state with nearby players

        });
        

        socketRef.current.on('nearby_players_with_troops', (data) => {
            setNearbyPlayerWithTroops(data.nearbyUsers); // Store the nearby players in the state
        });
      

        // // Handle incoming troop coordinates from the server
        // socket.on('troop_location_update', (data) => {
        //     // console.log('Received troop location update:', data);
        //     setPlayerTroops(data.troops); // Update the state with troop data
        // });

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return () => {
            // Clean up on component unmount
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const updateTroopLocation = (x, y, userId) => {
        if (socketRef.current) {
            socketRef.current.emit('troop_location_update', { // Correct the event name
                x: x,
                y: y,
                userId: userId
            });
        }
    }

    
    

    
    // Handle confirm button in modal
    const handleConfirmClaim = async () => {
        if (!planetToClaim) return;
        setIsClaiming(true); // Start loading state
    
        const result = await claimPlanet(planetToClaim.planetId, planetToClaim.userId); // Call claim API
        setClaimResult(result); // Set the result of the claim
        setIsClaiming(false); // Stop loading
    
        console.log('Claim result:', result);
    
        // Hide modal after claiming
        setModalVisible(false);
    
        // Check if the claim was successful (e.g., check if result.status or result.message is a success)
        if (result && result.message) {
            const { coordinates } = result; // Assuming the response contains coordinates
            // Call updateTroopLocation to update the troop's position if the claim was successful
            setTroopData(
                {
                    userId: userId,
                    old_x: parseFloat(result.userTroopCoordinates.x),
                    old_y: parseFloat(result.userTroopCoordinates.y),
                    new_x: parseFloat(coordinates.x),
                    new_y: parseFloat(coordinates.y),
                    troop_count: parseFloat(result.userTroopCoordinates.troopCount)
                }
            )
        } else {
            console.error('Error in claiming planet:', result.error || 'Unknown error');
        }

        setActivateTroops(true)
    
        // Hide claim result after 5 seconds
        setTimeout(() => {
            setClaimResult(null);
        }, 4000);
    };
    // Handle cancel button in modal
    const handleCancelClaim = () => {
        setModalVisible(false);
        setPlanetToClaim(null); // Reset the planet to claim
    };


    // Fetch other players' coordinates from the API
    // const fetchPlayerCoordinates = async (x, y) => {
    //     try {
    //         const response = await fetch('/api/user-coordinates', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify({ x, y, userId: localStorage.getItem('userId') }), // Send the current cursor coordinates
    //         });
    //         const data = await response.json();
    //         setOtherPlayers(data); // Store the returned player data
    //     } catch (error) {
    //         console.error('Error fetching player coordinates:', error);
    //     }
    // }

    const claimPlanet = async (planetId, userId) => {
        try {
            const response = await fetch('/api/claim-planet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planetId, userId, x: cursorCoordinatesSecond.x, y: cursorCoordinatesSecond.y }),
            });
            const data = await response.json();
            console.log('Claim planet response:', data);
            return data;
        } catch (error) {
            console.error('Error claiming planet:', error);
        }
    }

    // Fetch exoplanets based on visible grid area (viewport)
    const fetchExoplanets = async (x1, y1, x2, y2) => {
        try {
            const response = await fetch('/api/exoplanets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ x1, y1, x2, y2 }), // Send the visible grid area to the server
            });
            const data = await response.json();
            if (data.length === 0) {
                console.log('No exoplanets found in this area');
                setExoplanets([]); // Set state to an empty array if no data
                // setLoading(false);
            } else {
                setExoplanets(data);
            }
        } catch (error) {
            console.error('Error fetching exoplanets:', error);
            setExoplanets([]); // In case of error, set state to an empty array
        }
    }

    useEffect(() => {
        console.log("Loading state:", loading);
    }, [loading]);
    

    useEffect(() => {
        // Initialize PixiJS app to fit the entire window
        const app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x000000,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // Save the application instance in the ref
        appRef.current = app;
        pixiContainer.current.appendChild(app.view);

        // Create a container for all interactive elements (exoplanets and players)
        const container = new PIXI.Container();
        app.stage.addChild(container);

        // get screen size width and height
        const width = app.screen.width
        const height = app.screen.height

        // Center the container to start at (0,0), representing Earth’s position
        container.position.set((app.renderer.width / 2) - (width / 2), (app.renderer.height / 2) - (height / 2));

        // Variables for panning and zooming
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let zoom = 10;

        // Function to fetch exoplanets and player coordinates based on the current viewable area
        const fetchVisibleExoplanetsAndPlayers = () => {

            const x1 = -container.position.x / zoom;
            const y1 = -container.position.y / zoom;
            const x2 = (app.screen.width - container.position.x) / zoom;
            const y2 = (app.screen.height - container.position.y) / zoom;
            const padding = renderDistance;
    
            fetchExoplanets(x1 - padding, y1 - padding, x2 + padding, y2 + padding);
        };

        // Enable interactivity and panning
        app.stage.interactive = true;
        app.stage.hitArea = app.screen;
        app.stage.cursor = 'grab';

        app.stage.on('pointerdown', (event) => {
            isDragging = true;
            const position = event.data.global;
            dragStartX = position.x - container.position.x;
            dragStartY = position.y - container.position.y;
            app.stage.cursor = 'grabbing';
        });

        app.stage.on('pointerup', () => {
            isDragging = false;
            app.stage.cursor = 'grab';
            fetchVisibleExoplanetsAndPlayers(); // Fetch exoplanets and players for the new area after panning
        });

        app.stage.on('pointerupoutside', () => {
            isDragging = false;
            app.stage.cursor = 'grab';
            fetchVisibleExoplanetsAndPlayers();
        });

        app.stage.on('pointermove', (event) => {
            if (isDragging) {
                const newPosition = event.data.global;
                container.position.x = newPosition.x - dragStartX;
                container.position.y = newPosition.y - dragStartY;

                // cursorCoordinatesSecond = {
                //     x: (event.data.global.x - container.position.x) / zoom,
                //     y: (event.data.global.y - container.position.y) / zoom,
                // };

            }

            cursorCoordinatesSecond.x = (event.data.global.x - container.position.x) / zoom
            cursorCoordinatesSecond.y = (event.data.global.y - container.position.y) / zoom
            
            // console.log(cursorCoordinatesSecond.x, cursorCoordinatesSecond.y)
            
        });

        window.addEventListener('resize', () => {
            app.renderer.resize(window.innerWidth, window.innerHeight);
            fetchVisibleExoplanetsAndPlayers();
        });

        // Initial fetch when the component mounts
        fetchVisibleExoplanetsAndPlayers();

        return () => {
            app.destroy(true, true);
            window.removeEventListener('resize', fetchVisibleExoplanetsAndPlayers);
        };
    }, []);







    const [hovering, setHovering] = useState(false);

    // Separate useEffect to update user coordinates every 50ms
    // useEffect(() => {
    //     const intervalId = setInterval(() => {
    //         if (socketRef.current && !hovering) {  // Don't update coordinates when hovering
    //             socketRef.current.emit('location_update', {
    //                 x: cursorCoordinatesSecond.x,
    //                 y: cursorCoordinatesSecond.y,
    //                 userId: localStorage.getItem('userId')
    //             });
    //         }
    //     }, 50); // Emit updates every 50ms

    //     return () => clearInterval(intervalId); // Clean up the interval on component unmount
    // }, [cursorCoordinatesSecond, hovering]); // Re-run when hovering changes



    // useEffect(() => {
    //     const throttleUpdate = throttle(() => {
    //         if (socketRef.current && !hovering) {
    //             socketRef.current.emit('location_update', {
    //                 x: cursorCoordinatesSecond.x,
    //                 y: cursorCoordinatesSecond.y,
    //                 userId: localStorage.getItem('userId')
    //             });
        
    //             socketRef.current.emit('get_nearby_players', { userId });
    //         }
    //     }, 500); // Throttle emissions to once every 500ms
        
    
    //     const intervalId = setInterval(throttleUpdate, 50); // Update every 100ms, but throttle to emit less frequently
    
    //     return () => {
    //         clearInterval(intervalId);
    //     };
    // }, [hovering, userId]);



    useEffect(() => {
        const intervalId = setInterval(() => {
          if (socketRef.current && !hovering) {
            // Emit 'location_update' event to update user coordinates
            socketRef.current.emit('location_update', {
              x: cursorCoordinatesSecond.x,
              y: cursorCoordinatesSecond.y,
              userId: localStorage.getItem('userId')
            });
    
            // Emit 'get_nearby_players' event to fetch nearby players with their troops
            socketRef.current.emit('get_nearby_players', { userId });
          }
        }, 500); // Emit updates and fetch every 100ms
    
        // Clean up the interval and socket listener on component unmount
        return () => {
          clearInterval(intervalId); // Clear the interval
          
        };
      }, [hovering, userId]); // Re-run when hovering or userId changes
    
    
    


    // Function to calculate gradient color
    const calculateColor = (value) => {
        const overallMin = 0.3;
        const overallMax = 3800;
        const bellCurveMin = 0;
        const bellCurveMax = 30;
        const mean = (bellCurveMin + bellCurveMax) / 2;
        const stdDev = (bellCurveMax - bellCurveMin) / 6;
        const palette = [
            '#B3E5FC', '#B3E2FC', '#B3DFFC', '#FCE3B3', '#FCDAB3',
            '#FCD1B3', '#FCC8B3', '#FCBFB3', '#FCB6B3', '#FCAEB3',
            '#FCA5B3', '#FC9CB3', '#FC93B3', '#FC8AB3', '#FC81B3',
            '#FC78B3', '#FC6FB3', '#FC66B3', '#FC5DB3', '#FC54B3'
        ];
        let ratio;
        if (value >= bellCurveMin && value <= bellCurveMax) {
            ratio = Math.exp(-Math.pow(value - mean, 2) / (2 * stdDev * stdDev));
        } else {
            ratio = (value - overallMin) / (overallMax - overallMin);
        }
        const index = Math.floor(ratio * (palette.length - 1));
        return PIXI.utils.string2hex(palette[index]);
    }

    useEffect(() => {
        const app = appRef.current;
        const container = app.stage.children[0];

        // console.log('Rendering exoplanets:');

        // Remove previous exoplanets and players before rendering new ones
        container.removeChildren();

        // Draw Earth at (0,0)
        const earthGraphics = new PIXI.Graphics();
        const earthSize = 15; // Adjust size as needed for Earth
        earthGraphics.beginFill(0x0000FF); // Blue color for Earth
        earthGraphics.drawCircle(0, 0, earthSize); // Earth at (0,0)
        earthGraphics.endFill();
        container.addChild(earthGraphics);

        if (activateTroops && troopData) {
            const troopCount = troopData.troop_count || 1; // Default to 1 if troop_count is not defined
        
            // Define parameters for natural grouping and spread
            const spreadRadius = 20; // How far apart the troops are when spreading out near the destination
            const destinationRadius = 5; // Distance threshold at which troops start to spread out
        
            let lastUpdate = Date.now(); // Initialize the last update timestamp
        
            for (let i = 0; i < troopCount; i++) {
                // Check if troop already exists
                let existingTroop = container.children.find(child => child.userId === `troop-${userId}-${i}`);
        
                if (!existingTroop) {
                    // If the troop does not exist, create it
                    const troopGraphics = new PIXI.Graphics();
                    troopGraphics.beginFill(0x00FF00); // Green color for troops
                    troopGraphics.drawCircle(0, 0, 10); // Draw a green dot for the troop
                    troopGraphics.endFill();
                    troopGraphics.userId = `troop-${userId}-${i}`; // Assign a unique ID for each troop
                    container.addChild(troopGraphics);
                    existingTroop = troopGraphics; // Set it as the existing troop for updates
                }
        
                // Set initial position with a slight randomized offset to avoid diagonal lines
                const initialRandomOffsetX = Math.random() * 30 - 15; // Random offset between -15 and 15
                const initialRandomOffsetY = Math.random() * 30 - 15;
                existingTroop.x = (troopData.old_x * 10) + initialRandomOffsetX; // Scale and randomize
                existingTroop.y = (troopData.old_y * 10) + initialRandomOffsetY;
        
                // Ticker for continuous movement animation
                const ticker = new PIXI.Ticker();
                ticker.add(() => {
                    // Calculate the incremental movement with a speed factor
                    const speed = 0.0001; // Adjust speed factor for smooth movement
                    const dx = (troopData.new_x - troopData.old_x + initialRandomOffsetX) * speed;
                    const dy = (troopData.new_y - troopData.old_y + initialRandomOffsetY) * speed;
        
                    // Update the troop's position in a natural movement with slight random deviation
                    troopData.old_x += dx;
                    troopData.old_y += dy;
        
                    // Update troop graphics position
                    existingTroop.x = (troopData.old_x * 10) + initialRandomOffsetX; // Randomized movement
                    existingTroop.y = (troopData.old_y * 10) + initialRandomOffsetY;
        
                    // Calculate the distance to the destination
                    const distanceToTarget = Math.sqrt(Math.pow(troopData.new_x - troopData.old_x, 2) + Math.pow(troopData.new_y - troopData.old_y, 2));
        
                    if (distanceToTarget < destinationRadius) {
                        // When close to the destination, spread out evenly
                        const angle = (i / troopCount) * 2 * Math.PI; // Distribute troops in a circular pattern
                        const finalX = (troopData.new_x * 10) + spreadRadius * Math.cos(angle);
                        const finalY = (troopData.new_y * 10) + spreadRadius * Math.sin(angle);
        
                        // Move the troop to the calculated position in the circle
                        existingTroop.x = finalX;
                        existingTroop.y = finalY;
                    }
        
                    // Stop the animation when the troop reaches the destination and remove it
                    if (distanceToTarget < 0.5) {
                        existingTroop.x = troopData.new_x * 10; // Set final position
                        existingTroop.y = troopData.new_y * 10;
                        container.removeChild(existingTroop); // Remove troop when it reaches the final destination
                        ticker.stop(); // Stop the animation
                    }
        
                    // Update the troop's position on the server every 50ms
                    const now = Date.now();
                    if (now - lastUpdate >= 50) {
                        updateTroopLocation(troopData.old_x, troopData.old_y, userId);
                        lastUpdate = now; // Update the last update timestamp
                    }
                });
        
                ticker.start(); // Start the animation for this troop
            }
        }
        
        
        
        
        
        


        // create a snippet that will run when activateTroops is true, which will have the follwoiing arguments, userId, old_x, old_y, new_x, new_y. This function takes the beginning and end coordinates of the troop and updates the location of the troop on the map. This function will be called when the user clicks on the map to move the troop to a new location gradually:
    
        playerTroops.forEach(troop => {
            // Create a Graphics object for the troop
            const troopGraphics = new PIXI.Graphics();
            troopGraphics.beginFill(0x00FF00); // Green color for troops
            troopGraphics.drawCircle(0, 0, 10); // Draw a green dot for the troop
            troopGraphics.endFill();
    
            // Add the troop id below the dot
            const troopText = new PIXI.Text(troop.userId, {
                fill: 'white',
                fontSize: 12,
            });
            troopText.x = -10;
            troopText.y = 20;
            troopGraphics.addChild(troopText);
    
            // If troop already exists on the map, animate to the new position
            let existingTroop = container.children.find(child => child.userId === troop.userId);
    
            if (existingTroop) {
                // Animate the troop to the new position
                const startX = existingTroop.x;
                const startY = existingTroop.y;
                const endX = troop.coordinates.x * 10; // Adjust scale as needed
                const endY = troop.coordinates.y * 10; // Adjust scale as needed
    
                const ticker = new PIXI.Ticker();
                let elapsed = 0;
    
                ticker.add((delta) => {
                    elapsed += delta / PIXI.Ticker.shared.FPS;
    
                    const progress = Math.min(elapsed / 5, 1); // 5 seconds for the movement
    
                    existingTroop.x = startX + (endX - startX) * progress;
                    existingTroop.y = startY + (endY - startY) * progress;
    
                    if (progress === 1) {
                        ticker.stop(); // Stop the animation once it's done
                        ticker.destroy(); // Clean up the ticker
                    }
                });
    
                ticker.start();
            } else {
                // For new troops, just add them directly to the container
                troopGraphics.x = troop.coordinates.x * 10; // Adjust scale as needed
                troopGraphics.y = troop.coordinates.y * 10; // Adjust scale as needed
                troopGraphics.userId = troop.userId; // Attach userId for future reference
    
                container.addChild(troopGraphics);
            }
        });




        if (otherPlayers.length === 0) {
            setOtherPlayers((prevPlayers) => [
              ...prevPlayers,
              { userId: '0', coordinates: { x: 0, y: 0 } },
            ]);
          }

        try {
            // Define a duration for the movement animation (in seconds)
            const animationDuration = 5; // 5 seconds for the movement
            const tickers = [];
        
            nearbyPlayerWithTroops.forEach((player) => {
                const { userId, coordinates, troops } = player;
        
                // console.log('Player:', player);
        
                // Create a Graphics object for the player
                const playerGraphics = new PIXI.Graphics();
                playerGraphics.beginFill(0xFF0000); // Red color for other players
                playerGraphics.drawCircle(0, 0, 10); // Draw a red dot for the player
                playerGraphics.endFill();
        
                // Draw a bigger circle around the player
                playerGraphics.beginFill(0xFF0000, 0.3);
                playerGraphics.drawCircle(0, 0, 50); // Larger circle around the player
                playerGraphics.endFill();
        
                // Add the player id below the dot
                const playerText = new PIXI.Text(userId, {
                    fill: 'white',
                    fontSize: 12,
                });
                playerText.x = -10;
                playerText.y = 20;
                playerGraphics.addChild(playerText);
        
                // If player already exists on the map, animate to the new position
                let existingPlayer = container.children.find(child => child.userId === userId);
        
                if (existingPlayer) {
                    // Animate the player to the new position
                    const startX = existingPlayer.x;
                    const startY = existingPlayer.y;
                    const endX = coordinates.x * 10; // Adjust scale as needed
                    const endY = coordinates.y * 10; // Adjust scale as needed
        
                    const ticker = new PIXI.Ticker();
                    let elapsed = 0;
        
                    ticker.add((delta) => {
                        elapsed += delta / PIXI.Ticker.shared.FPS;
        
                        const progress = Math.min(elapsed / animationDuration, 1);
        
                        existingPlayer.x = startX + (endX - startX) * progress;
                        existingPlayer.y = startY + (endY - startY) * progress;
        
                        if (progress === 1) {
                            ticker.stop(); // Stop the animation once it's done
                            ticker.destroy(); // Clean up the ticker
                        }
                    });
        
                    tickers.push(ticker); // Save the ticker for potential later use (optional)
                    ticker.start();
                } else {
                    // For new players, just add them directly to the container
                    playerGraphics.x = coordinates.x * 10; // Adjust scale as needed
                    playerGraphics.y = coordinates.y * 10; // Adjust scale as needed
                    playerGraphics.userId = userId; // Attach userId for future reference
        
                    container.addChild(playerGraphics);
                }
        
                // Ensure that troops exist and are an array before processing them
                // Ensure that troops exist and are an array before processing them
if (troops && troops.count > 0) {
    const threshold = 0.1; // Define a threshold for movement
    const maxIdleTime = 5000; // Maximum idle time in milliseconds
    let lastUpdate = Date.now(); // Initialize the last update timestamp
    let lastPositions = {}; // Store the last positions of the troops

    for (let i = 0; i < troops.count; i++) {
        const troopCoordinates = troops.coordinates;

        // Render troops if coordinates are available
        if (troopCoordinates && troopCoordinates.x !== undefined && troopCoordinates.y !== undefined) {
            const troopGraphics = new PIXI.Graphics();
            troopGraphics.beginFill(0x00FF00); // Green color for troops
            troopGraphics.drawCircle(0, 0, 10); // Draw a green dot for each troop
            troopGraphics.endFill();

            // Position the troop based on troop coordinates
            troopGraphics.x = troopCoordinates.x * 10 + i * 5; // Offset the position slightly to avoid overlap
            troopGraphics.y = troopCoordinates.y * 10 + i * 5;

            // Add troop ID below the dot
            const troopText = new PIXI.Text(`Troop ${i + 1} of ${userId}`, {
                fill: 'white',
                fontSize: 10,
            });
            troopText.x = -10;
            troopText.y = 20;
            troopGraphics.addChild(troopText);

            // Add troop to the container
            container.addChild(troopGraphics);

            // Check if the troop has moved significantly
            const now = Date.now();
            const lastPosition = lastPositions[i];
            if (lastPosition && Math.abs(lastPosition.x - troopCoordinates.x) < threshold && Math.abs(lastPosition.y - troopCoordinates.y) < threshold && now - lastUpdate > maxIdleTime) {
                // If the troop hasn't moved significantly and has been idle for too long, remove it from the container
                container.removeChild(troopGraphics);
            } else {
                // Otherwise, update the last position and the last update timestamp
                lastPositions[i] = { x: troopCoordinates.x, y: troopCoordinates.y };
                lastUpdate = now;
            }
        }
    }
} else {
    console.warn(`No troops found for player ${userId}`);
}
            });
        } catch (error) {
            console.log('Error rendering other players and their troops:', error);
        }
        
        

        // If no exoplanets found, display message
        if (exoplanets.length === 0) {
            const noExoplanetsText = new PIXI.Text("No exoplanets found in this area", {
                fill: 'white',
                fontSize: 24,
            });
            noExoplanetsText.x = app.screen.width / 2 - 150;
            noExoplanetsText.y = app.screen.height / 2 - 20;
            container.addChild(noExoplanetsText);
            return;
        }

        let renderedExoplanetCount = 0;


        const basePlanetSize = 10;

        // Plot exoplanets based on their 2D coordinates and radius
        exoplanets.forEach((exo) => {
            const exoGraphics = new PIXI.Graphics();
            const exoSize = exo.pl_rade * basePlanetSize;
            
            // console.log('Exoplanet:', exo);
        
            // Calculate the color based on radius
            const color = calculateColor(exo.pl_rade);
        
            // Draw each exoplanet as a circle with a gradient color
            exoGraphics.beginFill(color);
            exoGraphics.drawCircle(0, 0, exoSize);
            exoGraphics.endFill();
        
            // Position the exoplanet based on 2D coordinates
            exoGraphics.x = exo.coordinates_2d_x * 10;
            exoGraphics.y = exo.coordinates_2d_y * 10;


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
            exoGraphics.interactive = true;
            exoGraphics.buttonMode = true;
        
            exoGraphics.on('pointerover', (event) => {
                setHovering(true);  // Set hovering to true when hovering starts
                const infoBox = infoBoxRef.current;
                infoBox.style.display = 'block';
                infoBox.innerHTML = `
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Name:</div>
                        <div class='fieldValue'>${exo.pl_name}</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>ID:</div>
                        <div class='fieldValue'>${exo.planet_id}</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Diameter:</div>
                        <div class='fieldValue'>${(exo.pl_rade * 6371 * 2).toFixed(2)} Km</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Temperature:</div>
                        <div class='fieldValue'>${(exo.temperature - 273.15).toFixed(2)} °C</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Distance:</div>
                        <div class='fieldValue'>${(exo.sy_dist * 3.26156).toFixed(2)} light years</div>
                    </div>
                    <div class='infoBoxItem'>
                        <div class='fieldLabel'>Owned by:</div>
                        <div class='fieldValue'>${exo.owner === "0" ? 'No one' : exo.owner}</div>
                    </div>

                `;
            
                // Add hover border animation
                exoGraphics.lineStyle(2, 0xFF6A6A); // Red border on hover
                exoGraphics.drawCircle(0, 0, exoSize);
                exoGraphics.endFill();
            
                // set cursor to pointer
                exoGraphics.cursor = 'pointer';

                // claim the planet if clicked, launch an alert asking for confirmation
                exoGraphics.on('pointerdown', () => {
                    // Trigger modal and set planet data
                    setPlanetToClaim({ planetId: exo.planet_id, userId });
                    setModalVisible(true); // Show modal for confirmation
                });
                
            });


            exoGraphics.on('pointermove', (event) => {
                const infoBox = infoBoxRef.current;
                infoBox.style.left = `${event.data.global.x + 10}px`;
                infoBox.style.top = `${event.data.global.y + 10}px`;
            });
        
            exoGraphics.on('pointerout', () => {
                setHovering(false);  // Set hovering to false when hover ends
                const infoBox = infoBoxRef.current;
                infoBox.style.display = 'none';
            
                // Remove hover border animation
                exoGraphics.clear(); // Clear the hover border
                exoGraphics.beginFill(color); // Redraw the planet without border
                exoGraphics.drawCircle(0, 0, exoSize);
                exoGraphics.endFill();
            
                // set cursor to default
                exoGraphics.cursor = 'default';
            });
        
            // Add the exoplanet to the container
            container.addChild(shadow)

            container.addChild(exoGraphics);

            renderedExoplanetCount++;

            // Check if all exoplanets have been rendered
            if (renderedExoplanetCount === exoplanets.length) {
                setLoading(false); // All exoplanets are rendered
            }

        });
        // setLoading(false);
    }, [exoplanets, otherPlayers, nearbyPlayerWithTroops]); // Re-render if either exoplanets or other players change





    return (
        <div>
            
    
            {/* Info Box Container */}
            <div ref={infoBoxRef} className='infoBoxWrapper'></div>
    
            {/* PixiJS Container */}
            <div
                ref={pixiContainer}
                style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}
            />
    
            <div style={{ position: 'absolute', top: 20, right: 20 }}>
                {cursorCoordinatesSecond.x && cursorCoordinatesSecond.y && (
                    <p>({cursorCoordinatesSecond.x.toFixed(2)}, {cursorCoordinatesSecond.y.toFixed(2)})</p>
                )}
            </div>

            {/* create the claimPlanet modal with the information returned */}

            {isModalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <p>Do you want to claim planet {planetToClaim?.planetId}?</p>
                        <button onClick={handleConfirmClaim} disabled={isClaiming}>
                            {isClaiming ? 'Claiming...' : 'Yes, Claim'}
                        </button>
                        <button onClick={handleCancelClaim}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Display the result of the claim */}
            {claimResult && (
                <div className="claim-result">
                    {claimResult.message ? (
                        <p>{claimResult.message}</p>
                    ) : (
                        <p>Error: {claimResult.error || 'Unknown error'}</p>
                    )}
                </div>
            )}

            {loading && (
                <div className='loadingPage'>
                    <span class="loader"></span>
                </div>
            )}

            
        </div>
    );
    
}

