export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
    }

    connect() {
        // Use environment variable or default to localhost for development
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.connected = false;
        };
    }

    handleMessage(message) {
        console.log('===== RECEIVED MESSAGE =====');
        console.log('Type:', message.type);
        console.log('Full message:', JSON.stringify(message, null, 2));

        switch (message.type) {
            case 'INIT':
                this.playerId = message.id;
                console.log('My Player ID:', this.playerId);
                console.log('Total players in INIT:', message.players.length);

                message.players.forEach((p, i) => {
                    console.log(`Player ${i}:`, { id: p.id, spriteId: p.spriteId, x: p.x, y: p.y });
                });

                // Initialize local player with sprite from server
                const localPlayerData = message.players.find(p => p.id === this.playerId);
                console.log('My player data:', localPlayerData);

                if (localPlayerData && this.game.initLocalPlayer) {
                    this.game.initLocalPlayer(localPlayerData);
                }

                // Add existing players
                message.players.forEach(pData => {
                    if (pData.id !== this.playerId) {
                        console.log('Adding existing player from INIT:', { id: pData.id, spriteId: pData.spriteId });
                        this.game.addRemotePlayer(pData);
                    }
                });
                break;

            case 'PLAYER_JOIN':
                console.log('PLAYER_JOIN message.player:', message.player);
                console.log('PLAYER_JOIN spriteId specifically:', message.player?.spriteId);
                this.game.addRemotePlayer(message.player);
                break;

            case 'PLAYER_MOVE':
                this.game.updateRemotePlayer(message.id, message);
                break;

            case 'PLAYER_LEAVE':
                console.log('Player left:', message.id);
                this.game.removeRemotePlayer(message.id);
                break;
        }
    }

    sendMove(x, y, direction, isMoving) {
        if (this.connected) {
            this.socket.send(JSON.stringify({
                type: 'MOVE',
                x,
                y,
                direction,
                isMoving
            }));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
