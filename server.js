// Import required modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server);

// Middleware setup
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(session({
    secret: 'abcdefg', // Secret key for session encryption
    resave: false, // Avoid resaving unchanged sessions
    saveUninitialized: true, // Save new but unmodified sessions
    cookie: { secure: false } // Allow cookies over HTTP (not HTTPS)
}));

// Data structures to manage rooms and users
const rooms = {}; // Stores room data, keyed by room ID
const userRooms = new Map(); // Tracks which room each user (socket ID) is in

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Event: Set username for the connected user
    socket.on('setUsername', (username) => {
        socket.username = username; // Attach username to the socket
        socket.emit('usernameSet', username); // Notify the client
        console.log(`Username set: ${username} for socket: ${socket.id}`);
    });

    // Event: Handle user reconnection to a room
    socket.on('rejoinRoom', (roomId) => {
        if (rooms[roomId]) {
            const players = rooms[roomId].players;

            // Replace old socket ID with the new one if the user was already in the room
            const oldSocketIndex = players.findIndex(id => id === userRooms.get(socket.id));
            if (oldSocketIndex !== -1) {
                players[oldSocketIndex] = socket.id;
            } else if (players.length < 2) {
                players.push(socket.id); // Add the user to the room if there's space
            }

            userRooms.set(socket.id, roomId); // Update user-room mapping
            socket.join(roomId); // Join the room
            socket.emit('roomJoined', roomId); // Notify the client
            console.log(`User rejoined room: ${roomId}`);
        }
    });

    // Event: Create a new room
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(7); // Generate a random room ID
        rooms[roomId] = { players: [socket.id] }; // Initialize room with the creator
        userRooms.set(socket.id, roomId); // Map user to the room
        socket.join(roomId); // Join the room
        socket.emit('roomCreated', roomId); // Notify the client
        socket.emit('roomJoined', roomId); // Notify the client they joined the room
        console.log(`Room created and joined by creator: ${roomId}`);
    });

    // Event: Join an existing room
    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id); // Add the user to the room
            socket.join(roomId); // Join the room
            userRooms.set(socket.id, roomId); // Map user to the room

            // Notify the client they joined the room
            socket.emit('roomJoined', roomId);

            // Notify both players of each other's usernames
            const usernames = rooms[roomId].players.map(id => io.sockets.sockets.get(id).username);
            if (usernames.length === 2) {
                io.to(rooms[roomId].players[0]).emit('updateOpponent', usernames[1]);
                io.to(rooms[roomId].players[1]).emit('updateOpponent', usernames[0]);
            } else {
                socket.emit('updateOpponent', 'Waiting for opponent...'); // Notify the first player to wait
            }
            console.log(`User joined room: ${roomId}`);
        } else {
            socket.emit('roomFull'); // Notify the client the room is full
        }
    });

    // Event: Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = userRooms.get(socket.id);

        if (roomId && rooms[roomId]) {
            // Delay room cleanup to allow for reconnection
            setTimeout(() => {
                if (!io.sockets.adapter.rooms.get(roomId)) {
                    delete rooms[roomId]; // Delete the room if no one is left
                    console.log(`Room ${roomId} deleted due to inactivity`);
                }
            }, 60000); // 1-minute timeout
        }

        userRooms.delete(socket.id); // Remove user from the user-room mapping
    });

    // Event: Handle user leaving a room
    socket.on('leaveRoom', () => {
        const roomId = userRooms.get(socket.id);

        if (roomId && rooms[roomId]) {
            // Remove the user from the room
            rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);

            // Notify the remaining player about the opponent leaving
            if (rooms[roomId].players.length > 0) {
                io.to(rooms[roomId].players[0]).emit('updateOpponent', 'Waiting for opponent...');
            }

            // Delete the room if it's empty
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            }

            // Clean up user-room mapping
            userRooms.delete(socket.id);
            socket.leave(roomId);

            // Notify the client they left the room
            socket.emit('roomLeft', roomId);
            console.log(`User left room: ${roomId}`);
        }
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
