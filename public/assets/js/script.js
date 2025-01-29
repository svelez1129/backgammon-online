// Socket.io initialization
const socket = io();

// DOM Elements
const createRoomButton = document.getElementById('create-room');
const joinRoomButton = document.getElementById('join-room');
const roomCodeInput = document.getElementById('room-code');
const usernameInput = document.getElementById('username-input');
const setUsernameButton = document.getElementById('set-username');
const roomControls = document.getElementById('room-controls');
const gameBoard = document.getElementById('game-board');

// Check for saved username and room on page load
window.addEventListener('load', () => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        socket.emit('setUsername', savedUsername);
        roomControls.style.display = 'block';
        document.getElementById('username-setup').style.display = 'none';
        document.getElementById('current-username').textContent = savedUsername;
    }

    const savedRoomId = localStorage.getItem('currentRoom');
    if (savedRoomId) {
        socket.emit('rejoinRoom', savedRoomId);
    }
});

// Event Listeners for Room Creation and Joining
createRoomButton.addEventListener('click', () => {
    socket.emit('createRoom');
});

joinRoomButton.addEventListener('click', () => {
    const roomId = roomCodeInput.value;
    if (roomId) {
        socket.emit('joinRoom', roomId);
    }
});

// Socket Event Handlers
//when room is created store the roomID in local storage so that when page is refreshed it is not deleted
socket.on('roomCreated', (roomId) => {
    localStorage.setItem('currentRoom', roomId);
    alert(`Room created! Share this code: ${roomId}`);
});

/* when room is joined set the room number, display the opponents name if they have one, and have the leave room 
*  button option. Then block the display of other buttons
*/
socket.on('roomJoined', (roomId) => {
    localStorage.setItem('currentRoom', roomId);
    document.getElementById('room-number').textContent = roomId;
    document.getElementById('opponent-username').style.display = 'block';
    document.getElementById('opponent-name').textContent = 'Waiting for opponent...';
    document.getElementById('leave-room').style.display = 'inline-block';
    document.getElementById('join-room').style.display = 'none';
    document.getElementById('room-code').style.display = 'none';
    document.getElementById('create-room').style.display = 'none';
    renderBoard();
});

//alert the user when the room is full
socket.on('roomFull', () => {
    alert('Room is full!');
});

//on disconnect remove the opponents username and make the join,create,room-code blocks visible
socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('opponent-username').style.display = 'none';
    document.getElementById('opponent-name').textContent = '';
    document.getElementById('join-room').style.display = 'block';
    document.getElementById('room-code').style.display = 'block';
    document.getElementById('create-room').style.display = 'block';
});

//when connected to the server, check if there is a username in local storage/roomID already in play in local storage
socket.on('connect', () => {
    console.log('Connected to server');
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        socket.emit('setUsername', savedUsername);
    }
    const savedRoomId = localStorage.getItem('currentRoom');
    if (savedRoomId) {
        socket.emit('rejoinRoom', savedRoomId);
    }
});

// Set the persons username and put it on local storage
setUsernameButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        localStorage.setItem('username', username);
        socket.emit('setUsername', username);
        roomControls.style.display = 'block';
        document.getElementById('username-setup').style.display = 'none';
    } else {
        alert('Please enter a username.');
    }
});

socket.on('usernameSet', (username) => {
    document.getElementById('current-username').textContent = username;
});

//update the opponents username if an opponent joins
socket.on('updateOpponent', (opponentUsername) => {
    const opponentDisplay = document.getElementById('opponent-name');
    opponentDisplay.textContent = opponentUsername || 'Waiting for opponent...';
});

// when the room is left display the join-room,room-code, and create-room
document.addEventListener('DOMContentLoaded', () => {
    const leaveRoomButton = document.getElementById('leave-room');
    if (leaveRoomButton) {
        leaveRoomButton.addEventListener('click', () => {
            console.log('Leave room button clicked');
            socket.emit('leaveRoom');
        });
    }
});


socket.on('roomLeft', () => {
    console.log('Received roomLeft event');
    localStorage.removeItem('currentRoom');
    document.getElementById('room-number').textContent = 'None';
    document.getElementById('leave-room').style.display = 'none';
    document.getElementById('opponent-username').style.display = 'none';
    document.getElementById('opponent-name').textContent = '';
    document.getElementById('room-controls').style.display = 'block';
    document.getElementById('join-room').style.display = 'inline-block';
    document.getElementById('room-code').style.display = 'inline-block';
    document.getElementById('create-room').style.display = 'inline-block';
    gameBoard.innerHTML = '';
});

function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';

    // Add the separator in the middle of the board
    const separator = document.createElement('div');
    separator.className = 'separator';
    gameBoard.appendChild(separator);

    // Create points and set up pieces according to Backgammon rules
    for (let i = 1; i <= 24; i++) {
        const point = document.createElement('div');
        point.classList.add('point');
        let numPieces = 0;
        let playerClass = '';

        // Assign pieces to points based on traditional setup
        if ([12, 24].includes(i)) {
            numPieces = 2;  // Points 1 and 24 have 2 pieces each
            if (i==12) {
                playerClass = 'player1';  
            } else
                playerClass = 'player2';
        } else if ([1, 13].includes(i)) {
            numPieces = 5;  // Points 1 and 24 have 2 pieces each
            if (i==1) {
                playerClass = 'player1';  
            } else
                playerClass = 'player2';
        } else if ([7, 19].includes(i)) {
            numPieces = 5;  // Points 1 and 24 have 2 pieces each
            if (i==19) {
                playerClass = 'player1';  
            } else
                playerClass = 'player2';
        } else if ([5, 17].includes(i)) {
            numPieces = 3;  // Points 1 and 24 have 2 pieces each
            if (i==17) {
                playerClass = 'player1';  
            } else
                playerClass = 'player2';
        }

        // Append the appropriate number of pieces to each point
        for (let j = 0; j < numPieces; j++) {
            const piece = document.createElement('div');
            piece.classList.add('piece', playerClass);
            point.appendChild(piece);
        }

        gameBoard.appendChild(point);
    }
}
