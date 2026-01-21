const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const players = new Map();

// Create HTTP server for health checks and WebSocket upgrade
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/health/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('healthy');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

server.listen(8080, () => {
    console.log('Server started on port 8080');
});

wss.on('connection', (ws) => {
    const playerId = uuidv4();
    console.log(`Player connected: ${playerId}`);

    // Randomly assign sprite ID (0-10 for 11 different character sprites)
    const spriteId = Math.floor(Math.random() * 11);
    console.log(`Player ${playerId} assigned spriteId: ${spriteId}`);

    // Initialize player state
    const player = {
        id: playerId,
        x: 18, // Default spawn X (center of map)
        y: 10, // Default spawn Y
        direction: 0,
        isMoving: false,
        spriteId: spriteId
    };

    players.set(ws, player);

    // Send initialization message to the new player
    // Ensure all existing players have spriteId (fix for any old connections)
    const playersArray = Array.from(players.values()).map(p => {
        if (p.spriteId === undefined || p.spriteId === null) {
            console.warn('Player without spriteId detected! Assigning one:', p.id);
            p.spriteId = Math.floor(Math.random() * 11);
        }
        return p;
    });

    const initMessage = {
        type: 'INIT',
        id: playerId,
        players: playersArray
    };
    console.log('Sending INIT to new player:', playerId, 'with', players.size, 'existing players');
    console.log('INIT message players:', initMessage.players.map(p => ({ id: p.id, spriteId: p.spriteId })));
    ws.send(JSON.stringify(initMessage));

    // Broadcast new player to everyone else
    // Verify the player object has spriteId
    console.log('Player object before broadcast:', player);
    console.log('Player.spriteId:', player.spriteId);
    console.log('Player keys:', Object.keys(player));

    const joinMessage = {
        type: 'PLAYER_JOIN',
        player: {
            id: player.id,
            x: player.x,
            y: player.y,
            direction: player.direction,
            isMoving: player.isMoving,
            spriteId: player.spriteId
        }
    };
    console.log('Broadcasting PLAYER_JOIN, message:', JSON.stringify(joinMessage));
    broadcast(joinMessage, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'MOVE':
                    // Update player state
                    if (players.has(ws)) {
                        const p = players.get(ws);
                        p.x = data.x;
                        p.y = data.y;
                        p.direction = data.direction;
                        p.isMoving = data.isMoving;

                        // Broadcast movement to everyone else
                        broadcast({
                            type: 'PLAYER_MOVE',
                            id: playerId,
                            x: p.x,
                            y: p.y,
                            direction: p.direction,
                            isMoving: p.isMoving
                        }, ws);
                    }
                    break;
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        players.delete(ws);

        // Broadcast disconnection
        broadcast({
            type: 'PLAYER_LEAVE',
            id: playerId
        });
    });
});

function broadcast(message, excludeWs = null) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            client.send(data);
        }
    });
}
