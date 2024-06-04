import WebSocket from "ws";
import {Coin, Post, Trade} from "./generated/prisma/client";
import {config} from "./config";

type EventMessage = CoinCreatedMessage | PostCreatedMessage | TradeCreatedMessage;

type CoinCreatedMessage = {
    type: "coin_created",
    data: Coin
}

type PostCreatedMessage = {
    type: "post_created",
    data: Post
}
type TradeCreatedMessage = {
    type: "trade_created",
    data: Trade

}


const wss = new WebSocket.Server({
    // server
    port: config.wsPort
});
wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    ws.on('message', (message: string) => {
        console.log(`Received message => ${message}`);
    });
    ws.on('pong', () => {
        console.log('Received pong from client');
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });

});

const sendPing = () => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.ping();
        }
    });
};

// Set interval for sending pings
setInterval(sendPing, 5000);

// Function to broadcast messages to all connected clients
export const broadcastToWs = (data: EventMessage) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};
