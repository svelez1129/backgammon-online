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


let boardState = null;

/**
 * Creates the default board state for a new game of Backgammon.
 * Each element in boardState is [count, playerNumber].
 * Example: [3, 1] means there are 3 pieces of 'player1' on that point.
 */
function initializeBoardState() {
    // Index 0 is unused so indexes match point numbers directly (1–24).
    const newState = new Array(25).fill(null).map(() => [0, 0]);

    // Example initial positions (Adjust to your desired layout).
    // Format: newState[point] = [numberOfPieces, playerNumber]
    newState[1]  = [5, 1];   // 2 pieces, player1, on point 1
    newState[24] = [2, 2];   // 2 pieces, player2, on point 24
    newState[12] = [2, 1];   // 5 pieces, player2, on point 12
    newState[13] = [5, 2];   // 5 pieces, player1, on point 13
    newState[7]  = [5, 2];   // 5 pieces, player2, on point 7
    newState[19] = [5, 1];   // 5 pieces, player1, on point 19
    newState[5]  = [3, 2];   // 3 pieces, player2, on point 5
    newState[17] = [3, 1];   // 3 pieces, player1, on point 17

    return newState;
}

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
    // If no board exists, create it now
    boardState = initializeBoardState();
    renderBoard(boardState);
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
    renderBoard(boardState);
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

//board state and making the board
function renderBoard(currentState) {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';  // Clear previous contents

    // Separator
    const separator = document.createElement('div');
    separator.className = 'separator';
    gameBoard.appendChild(separator);

    // Loop through points 1–24
    for (let pointNum = 1; pointNum <= 24; pointNum++) {
        const pointDiv = document.createElement('div');
        pointDiv.classList.add('point');
        
        const [count, player] = currentState[pointNum];
        if (count > 0) {
            const playerClass = (player === 1) ? 'player1' : 'player2';
            for (let i = 0; i < count; i++) {
                const piece = document.createElement('div');
                piece.classList.add('piece', playerClass);
                pointDiv.appendChild(piece);
            }
        }

        gameBoard.appendChild(pointDiv);
    }
}

