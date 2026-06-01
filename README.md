# 🎲 Juego de Varones

Juego de Monopoly multijugador online para hasta 7 jugadores, con personajes únicos, mecánicas especiales y mucho drama entre amigos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Estado | Zustand |
| Backend | Node.js + Express + TypeScript |
| Realtime | Socket.IO |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | JWT + bcrypt |
| Validación | Zod |

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (o Docker)
- npm / pnpm

## Instalación rápida

### 1. Clonar y configurar

```bash
git clone https://github.com/ales231/monopolio
cd monopolio
```

### 2. Base de datos

Con Docker (recomendado):
```bash
docker compose up postgres -d
```

Sin Docker — crea una base de datos PostgreSQL manualmente.

### 3. Configurar el servidor

```bash
cd server
cp .env.example .env
# Edita .env con tu DATABASE_URL y JWT_SECRET
npm install
npm run db:migrate
npm run db:generate
```

### 4. Correr el servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build && npm start
```

### 5. Configurar el cliente

```bash
cd ../client
npm install
```

### 6. Correr el cliente

```bash
npm run dev
# Abre http://localhost:5173
```

## Variables de entorno del servidor

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Clave secreta para JWT | `mi_clave_super_secreta` |
| `JWT_EXPIRES_IN` | Expiración del token | `7d` |
| `PORT` | Puerto del servidor | `3001` |
| `CLIENT_URL` | URL del frontend | `http://localhost:5173` |
| `UPLOAD_DIR` | Directorio de avatares | `./uploads` |

## Comandos Prisma

```bash
# Crear migración
npm run db:migrate

# Generar cliente
npm run db:generate

# Abrir Prisma Studio (UI para la DB)
npm run db:studio
```

## Docker (todo junto)

```bash
docker compose up --build
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

## Cómo jugar

1. **Regístrate** en `/register`
2. **Crea una sala** en el dashboard → te genera un código de 6 letras
3. **Comparte el código** con tus amigos
4. **Elige tu personaje** (7 disponibles, sin repetir)
5. **Márcate como listo**
6. El **host inicia la partida**
7. Por turnos: lanza dados → muévete → compra/paga/carta
8. Usa tu **habilidad especial** cuando esté lista
9. El último en pie **sin bancarrota** gana

## Personajes

| Personaje | Dinero | Habilidad | Desventaja |
|-----------|--------|-----------|-----------|
| 🏈 Ales | $1500 | Comeback Dice (3 dados post-lesión) | Cada 3 turnos se lesiona |
| 🤝 Arthur | $1500 | Intercambio Forzado | No cobra salida ($200) |
| 🤙 Luis | $1500 | Hit Player | Solo avanza con dados impares |
| 👑 Dehivid | $1900 | Empieza rico | Empuja a quien caiga en su casilla |
| 🐕 José Vaca | $1400 | Perro (3 dados) + Escudo pago | Empieza con $100 de deuda |
| 💻 Mateo | $1500 | Cyber Steal (hackeo) | Pierde turno en bares/discotecas |
| 💊 Ariel | $1500 | Maldición Médica ($50) | Si saca ≥8 solo avanza 6 |

## Estructura del proyecto

```
monopolio/
├── client/                   # Frontend React
│   ├── src/
│   │   ├── components/game/  # Board, DiceRoller, PlayerCard, etc.
│   │   ├── pages/            # Login, Register, Dashboard, Lobby, Game, Profile
│   │   ├── store/            # Zustand (authStore, gameStore)
│   │   ├── sockets/          # Socket.IO client + emit helpers
│   │   └── data/             # board.ts, characters.ts
│   └── package.json
│
├── server/                   # Backend Node.js
│   ├── prisma/schema.prisma  # Modelos DB
│   ├── src/
│   │   ├── game/engine/      # GameEngine.ts — lógica central del juego
│   │   ├── game/data/        # board.ts, characters.ts, cards.ts
│   │   ├── sockets/index.ts  # Todos los eventos Socket.IO
│   │   ├── auth/router.ts    # Login, Register, /me
│   │   ├── rooms/service.ts  # Gestión de salas en memoria
│   │   └── index.ts          # Entry point Express + Socket.IO
│   └── package.json
│
├── shared/types/index.ts     # Tipos compartidos
└── docker-compose.yml
```

## Socket Events

### Cliente → Servidor
- `room:create` — Crear sala
- `room:join { code }` — Unirse por código
- `room:leave` — Salir de sala
- `player:selectCharacter { characterId }` — Elegir personaje
- `player:setReady { ready }` — Marcar listo
- `game:start` — Host inicia la partida
- `game:rollDice` — Lanzar dados
- `game:buyProperty` — Comprar propiedad actual
- `game:skipBuy` — No comprar
- `game:useAbility { abilityId, targetPlayerId? }` — Usar habilidad especial
- `game:mortgageProperty { propertyId }` — Hipotecar propiedad
- `game:endTurn` — Terminar turno
- `game:declareBankruptcy` — Declarar bancarrota
- `chat:message { message }` — Enviar mensaje al chat

### Servidor → Cliente
- `room:updated { room }` — Estado actualizado de la sala
- `game:started { gameState }` — La partida comenzó
- `game:state { gameState }` — Estado completo del juego
- `game:diceRolled { dice, playerId }` — Resultado de dados
- `game:propertyBought { propertyId, playerId }` — Propiedad comprada
- `game:playerBankrupt { playerId }` — Jugador eliminado
- `game:finished { winner }` — Ganador
- `chat:message` — Mensaje de chat
- `error { message }` — Error

---

*Juego de Varones — Hecho con 🎲 entre amigos*
