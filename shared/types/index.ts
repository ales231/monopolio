export type PlayerStatus = 'active' | 'bankrupt' | 'disconnected';
export type RoomStatus = 'LOBBY' | 'IN_GAME' | 'FINISHED';
export type GamePhase = 'roll' | 'moving' | 'resolve' | 'buy' | 'ability' | 'end' | 'waiting';

export type TileType =
  | 'start'
  | 'property'
  | 'party'
  | 'group_card'
  | 'chaos_card'
  | 'tax'
  | 'jail'
  | 'go_to_jail'
  | 'free_parking'
  | 'intercambiador'
  | 'special_property'
  | 'medical'
  | 'technology'
  | 'sports'
  | 'luxury_property';

export interface BoardTile {
  id: number;
  name: string;
  type: TileType;
  price?: number;
  rent?: number;
  group?: string;
  amount?: number;
}

export interface Property {
  id: number;
  name: string;
  type: string;
  group: string;
  price: number;
  baseRent: number;
  rentWithOneHouse: number;
  rentWithTwoHouses: number;
  rentWithThreeHouses: number;
  rentWithHotel: number;
  ownerId?: string;
  mortgaged: boolean;
  houses: number;
  hasHotel: boolean;
  canBeBought: boolean;
  canBeMortgaged: boolean;
  canBeUpgraded: boolean;
}

export interface Character {
  id: string;
  name: string;
  phrase: string;
  startingMoney: number;
  initialDebt?: number;
  disadvantage: string;
  advantage: string;
  passive?: string;
  specialAbility?: string;
  secondaryAbility?: string;
  cooldown: number;
  color: string;
  emoji: string;
}

export interface Card {
  id: string;
  deck: 'chaos' | 'group';
  title: string;
  description: string;
  effectType: string;
  amount?: number;
  target?: 'self' | 'all' | 'richest' | 'random' | 'chosen';
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  characterId: string;
  money: number;
  position: number;
  properties: number[];
  isBankrupt: boolean;
  isReady: boolean;
  skipNextTurn: boolean;
  jailTurns: number;
  cooldowns: Record<string, number>;
  statuses: PlayerStatus[];
  turnsSinceLastInjury: number;
  injuredThisTurn: boolean;
  comebackPending: boolean;
  rentShield: boolean;
  taxShield: boolean;
  abilitiesDisabled: boolean;
  connectionStatus: 'connected' | 'disconnected';
  // José Vaca
  initialDebt: number;
}

export interface Room {
  id: string;
  code: string;
  hostUserId: string;
  players: RoomPlayer[];
  status: RoomStatus;
  createdAt: Date;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  characterId?: string;
  isReady: boolean;
  isHost: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  type: string;
  message: string;
  data?: unknown;
}

export interface GameState {
  id: string;
  roomId: string;
  players: Player[];
  properties: Property[];
  currentPlayerIndex: number;
  currentPlayerId: string;
  turn: number;
  phase: GamePhase;
  lastDice?: number[];
  lastCard?: Card;
  events: GameEvent[];
  winner?: Player;
  status: 'waiting' | 'playing' | 'finished';
  pendingAction?: PendingAction;
  chaosCardDeck: Card[];
  groupCardDeck: Card[];
}

export interface PendingAction {
  type: 'buy' | 'ability_target' | 'trade' | 'dice_choice';
  playerId: string;
  data?: unknown;
}

export interface DiceResult {
  dice: number[];
  total: number;
  canMove: boolean;
  specialMove?: number;
  reason?: string;
}

export interface TradeProposal {
  fromPlayerId: string;
  toPlayerId: string;
  offerMoney: number;
  offerProperties: number[];
  wantMoney: number;
  wantProperties: number[];
}
