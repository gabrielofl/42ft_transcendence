## Contrato de Eventos WebSocket (Backend → Frontend)

Este documento especifica los eventos en tiempo real que el backend emite al frontend y las entradas que el backend acepta desde el frontend. Úsalo como única fuente de verdad para la integración del juego Pong.

### Canal
- URL: `wss://<backend-host>/ws`

---

## Eventos de Salida (Servidor → Cliente)

### 1) game_state
- Frecuencia: periódica mientras se juega
- Propósito: snapshot autoritativo del juego
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{
  "event": "game_state",
  "roomId": "room-123",
  "tournamentId": null,
  "state": {
    "ball": { "x": 400, "y": 300, "vx": 15, "vy": 10, "size": 20 },
    "players": {
      "player1": { "y": 250, "score": 3 },
      "player2": { "y": 260, "score": 2 }
    },
    "gameEnded": false,
    "isTournament": false,
    "timeLimit": null,
    "startTime": null
  }
}
```

### 2) player_scored
- Propósito: notificar cambios de puntuación inmediatamente
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{
  "event": "player_scored",
  "player": "player1",
  "score": 4,
  "scores": { "player1": 4, "player2": 2 },
  "roomId": "room-123",
  "tournamentId": null,
  "round": null,
  "matchIndex": null
}
```

### 3) countdown
- Propósito: cuenta atrás previa al juego
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{ "event": "countdown", "seconds": 3, "roomId": "room-123", "tournamentId": null }
```

### 4) game_start
- Propósito: señalar inicio de partida
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{ "event": "game_start", "roomId": "room-123", "tournamentId": null }
```

### 5) game_paused
- Propósito: señalar pausa de la partida
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{ "event": "game_paused", "reason": "opponent_disconnected", "roomId": "room-123", "tournamentId": null }
```

### 6) game_ended
- Propósito: resumen del resultado final
- Origen: backend/src/websocket/game-handler.js
- Ejemplo:
```json
{
  "event": "game_ended",
  "roomId": "room-123",
  "tournamentId": null,
  "round": null,
  "matchIndex": null,
  "winner": { "userId": 10, "name": "Alice", "score": 5 },
  "loser":  { "userId": 11, "name": "Bob",   "score": 3 },
  "reason": "score_limit",
  "isTournament": false
}
```

### 7) room_info
- Propósito: estado de la sala y jugadores
- Origen: backend/src/websocket/notifications.js
- Ejemplo:
```json
{
  "event": "room_info",
  "roomId": "room-123",
  "slot": "player1",
  "status": "ready",
  "players": {
    "player1": { "userId": 10, "connected": true,  "name": "Alice" },
    "player2": { "userId": 11, "connected": true,  "name": "Bob" }
  }
}
```

### 8) waiting_opponent
- Propósito: aviso de UI mientras se espera rival
- Origen: backend/src/websocket/notifications.js
- Ejemplo:
```json
{ "event": "waiting_opponent" }
```

### 9) Torneo (si aplica)
- Emisiones varias desde backend/src/websocket/index.js:
  - `tournament_bracket_created`
  - `joined_tournament_room`
  - `tournament_countdown`
  - `tournament_game_start`
  - `tournaments_list`
  - `tournament_match_finished`
  - `tournament_next_round_created`
  - `tournament_next_round`
  - `tournament_finished`

Ejemplo (bracket creado):
```json
{
  "event": "tournament_bracket_created",
  "tournamentId": "t-1",
  "round": 1,
  "matches": [
    { "matchId": 1, "roomId": "room-A", "player1": 10, "player2": 11, "status": "waiting" }
  ],
  "message": "🏆 Bracket creado: 1 partidas de cuartos de final"
}
```

---

## Mensajes de Entrada (Cliente → Servidor)

### 1) Movement
- Propósito: enviar delta de movimiento de la pala
- Entrada: backend/src/websocket/index.js → `handleMove`
- Ejemplo:
```json
{ "player": "player1", "move": -8 }
```

### 2) Actions (start/pause/end)
- Propósito: controlar el estado del juego
- Entrada: backend/src/websocket/index.js → `handleAction`
- Ejemplos:
```json
{ "action": "start" }
{ "action": "pause" }
{ "action": "end" }
```

### 3) Torneo (si aplica)
- Unirse/crear/listar/unirse a sala
```json
{ "userId": 10, "joinOrCreateTournament": true }
{ "userId": 10, "listTournaments": true }
{ "userId": 10, "joinTournamentRoom": "room-A" }
```

---

## Notas para Frontend

- La velocidad de la pelota puede calcularse con `state.ball.vx/vy`.
- Palas: usa `state.players.playerX.y` y `score` para la UI.
- Para visuales suaves, interpola los meshes del cliente hacia el `game_state` del servidor.
- El servidor es autoritativo; el cliente solo envía input.

---

## Referencias de Archivos (dónde se emiten eventos)

- Bucle de juego y emisiones: `backend/src/websocket/game-handler.js`
  - game_state, player_scored, countdown, game_start, game_paused, game_ended
- Info de sala y eventos semánticos de sala: `backend/src/websocket/notifications.js`
- Flujo de torneos: `backend/src/websocket/index.js`

Si necesitas campos adicionales en `game_state` (p. ej., longitud de pala, escudos, power-ups), extiende el estado en `backend/src/game.js` y el emisor en `game-handler.js` en consecuencia.


