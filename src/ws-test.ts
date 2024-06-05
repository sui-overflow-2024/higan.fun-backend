const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to the server');

    // Emit a test message
    socket.emit('message', {type: 'trade', userId: 'user1', amount: 50});

    // Subscribe to a channel or event
    socket.emit('subscribe', {event: 'messagePosted', tokenId: 1});

    // Listen for events
    socket.on('messagePosted:1', (data: any) => {
        console.log('Message for token 1:', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Disconnected from the server');
    });
});

socket.on('connect_error', (error: any) => {
    console.log('Connection Error:', error);
});