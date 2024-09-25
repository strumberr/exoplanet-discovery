'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export default function Game() {
    const [socket, setSocket] = useState(null);

    // Connect to Socket.IO server with the custom path
    useEffect(() => {
        const socketIo = io({
            path: '/api/socket', // Make sure this matches the server path
        });
        setSocket(socketIo);

        socketIo.on('nearbyPlayers', (data) => {
            console.log('Nearby players:', data);
            // Handle incoming player data
        });

        return () => socketIo.disconnect(); // Clean up the connection when the component unmounts
    }, []);

    // Example of sending the position
    useEffect(() => {
        if (socket) {
            const intervalId = setInterval(() => {
                const userId = localStorage.getItem('userId') || '1';
                socket.emit('updatePosition', { userId, x: 100, y: 200 }); // Example coordinates
            }, 200);

            return () => clearInterval(intervalId);
        }
    }, [socket]);

    return <div>Socket.IO Game</div>;
}
