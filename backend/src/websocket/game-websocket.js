/* export type GameSocketConnect = {
    username: string,
}

class ServerGameSocket {
    game: Game;

    constructor() {
        this.game = new Game();
    }
}

let sockets: Record<number, ServerGameSocket>

export default async function registerWebsocketEndPoint(fastify) {
    fastify.get('/game-ws/:room', { websocket: true }, (connection, req) => {
        const { room } = req.params as { room: string };

        // Si no existe la sala, la creamos
        if (!sockets[room]) {
            sockets[room] = new ServerGameSocket(room);
        }

        const gameSocket = sockets[room];
        patchSocketLogging(fastify, connection);

        // Agregamos la conexión a la sala
        gameSocket.addConnection(connection);

        // Manejo de mensajes usando el handler central
        connection.socket.on('message', (rawMessage) => {
            try {
                const message = JSON.parse(rawMessage.toString());
                SocketGameHandler.handleMessage(room, connection, message);
            } catch (err) {
                console.error("Mensaje inválido:", err);
            }
        });

        // Limpieza cuando el cliente se desconecta
        connection.socket.on('close', () => {
            gameSocket.removeConnection(connection);

            if (gameSocket.isEmpty()) {
                delete sockets[room];
            }
        });
    });
} */