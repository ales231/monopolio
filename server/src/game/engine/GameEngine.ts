import { v4 as uuid } from 'uuid';
import {
  GameState, Player, Property, GameEvent, Card,
  DiceResult, GamePhase, BoardTile,
} from '../../../../shared/types/index';
import { BOARD_TILES, PURCHASABLE_TYPES, PARTY_GROUPS, INTERCAMBIADOR_RENTS, createInitialProperties } from '../data/board';
import { CHAOS_CARDS, GROUP_CARDS, shuffleDeck } from '../data/cards';
import { getCharacter } from '../data/characters';

// In-memory store of active games keyed by roomId
const activeGames = new Map<string, GameState>();

export class GameEngine {
  // ── Factory ─────────────────────────────────────────────────────────────
  static createGame(roomId: string, roomPlayers: { userId: string; username: string; avatarUrl?: string; characterId: string }[]): GameState {
    const players: Player[] = roomPlayers.map((rp) => {
      const char = getCharacter(rp.characterId);
      const startingMoney = char?.startingMoney ?? 1500;
      const initialDebt = char?.initialDebt ?? 0;
      return {
        id: uuid(),
        userId: rp.userId,
        username: rp.username,
        avatarUrl: rp.avatarUrl,
        characterId: rp.characterId,
        money: startingMoney - initialDebt,
        position: 0,
        properties: [],
        isBankrupt: false,
        isReady: false,
        skipNextTurn: false,
        jailTurns: 0,
        cooldowns: {},
        statuses: ['active'],
        turnsSinceLastInjury: 0,
        injuredThisTurn: false,
        rentShield: false,
        taxShield: false,
        abilitiesDisabled: false,
        connectionStatus: 'connected',
        initialDebt,
      };
    });

    const properties = createInitialProperties();
    // José Vaca starts with first property mortgaged
    const joseVaca = players.find((p) => p.characterId === 'jose_vaca');
    if (joseVaca && properties.length > 0) {
      const cheapest = properties.find((pr) => pr.canBeMortgaged);
      if (cheapest) cheapest.mortgaged = true;
    }

    const game: GameState = {
      id: uuid(),
      roomId,
      players,
      properties,
      currentPlayerIndex: 0,
      currentPlayerId: players[0].id,
      turn: 1,
      phase: 'roll',
      events: [],
      status: 'playing',
      chaosCardDeck: shuffleDeck(CHAOS_CARDS),
      groupCardDeck: shuffleDeck(GROUP_CARDS),
    };

    activeGames.set(roomId, game);
    return game;
  }

  static getGame(roomId: string): GameState | undefined {
    return activeGames.get(roomId);
  }

  static deleteGame(roomId: string): void {
    activeGames.delete(roomId);
  }

  // ── Dice ────────────────────────────────────────────────────────────────
  static rollDice(roomId: string, playerId: string): { game: GameState; result: DiceResult } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };
    if (game.currentPlayerId !== playerId) return { error: 'No es tu turno.' };
    if (game.phase !== 'roll') return { error: 'No es momento de lanzar dados.' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player || player.isBankrupt) return { error: 'Jugador inválido.' };

    // Handle injury (Ales)
    if (player.characterId === 'ales') {
      player.turnsSinceLastInjury += 1;
      if (player.turnsSinceLastInjury >= 3 && !player.injuredThisTurn) {
        player.injuredThisTurn = true;
        player.skipNextTurn = true;
        player.turnsSinceLastInjury = 0;
        this.addEvent(game, playerId, 'injury', `${player.username} se lesionó. Pierde el próximo turno.`);
        game.phase = 'end';
        activeGames.set(roomId, game);
        return { game, result: { dice: [], total: 0, canMove: false, reason: 'Ales se lesionó.' } };
      }
    }

    const char = getCharacter(player.characterId);
    let dice: number[] = [];
    let result: DiceResult;

    // Three-dice characters choose 2 best
    if (player.characterId === 'jose_vaca' || (player.characterId === 'ales' && player.injuredThisTurn === false && player.turnsSinceLastInjury === 0 && player.skipNextTurn === false)) {
      // Normal 2 dice for now; special handled below per character
      dice = [this.d6(), this.d6()];
    } else {
      dice = [this.d6(), this.d6()];
    }

    // José Vaca — always 3 dice, pick best 2
    if (player.characterId === 'jose_vaca') {
      const three = [this.d6(), this.d6(), this.d6()];
      three.sort((a, b) => b - a);
      dice = three.slice(0, 2);
    }

    const total = dice.reduce((s, d) => s + d, 0);
    let canMove = true;
    let specialMove: number | undefined;
    let reason: string | undefined;

    // Luis — only moves on odd sums
    if (player.characterId === 'luis' && total % 2 === 0) {
      canMove = false;
      player.skipNextTurn = false; // don't double-skip
      this.addEvent(game, playerId, 'luis_no_move', `${player.username} sacó par (${total}). No se mueve.`);
    }

    // Ariel — if 8+ only moves 6
    if (player.characterId === 'ariel' && total >= 8) {
      specialMove = 6;
      reason = `Ariel avanza solo 6 (sacó ${total}).`;
    }

    game.lastDice = dice;
    game.phase = canMove ? 'moving' : 'end';

    result = { dice, total, canMove, specialMove, reason };

    if (canMove) {
      const steps = specialMove ?? total;
      this.movePlayer(game, player, steps);
    }

    activeGames.set(roomId, game);
    return { game, result };
  }

  private static d6(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  // ── Movement ────────────────────────────────────────────────────────────
  private static movePlayer(game: GameState, player: Player, steps: number): void {
    const prevPosition = player.position;
    const newPosition = (prevPosition + steps) % 40;

    // Passed GO
    if (newPosition < prevPosition || (prevPosition + steps >= 40)) {
      if (player.characterId !== 'arthur') {
        player.money += 200;
        this.addEvent(game, player.id, 'passed_go', `${player.username} pasó por Salida y cobró $200.`);
      } else {
        this.addEvent(game, player.id, 'passed_go_arthur', `${player.username} pasó por Salida pero no cobra (Arthur).`);
      }
    }

    player.position = newPosition;
    this.addEvent(game, player.id, 'move', `${player.username} avanzó a ${BOARD_TILES[newPosition].name}.`);

    // Dehivid passive: push any player on his tile back 1
    this.applyDehividPassive(game, player);

    // Collision effects
    this.checkCollisions(game, player);

    game.phase = 'resolve';
    this.resolveTile(game, player);
  }

  // ── Tile Resolution ─────────────────────────────────────────────────────
  static resolveTile(game: GameState, player: Player): void {
    const tile = BOARD_TILES[player.position];

    switch (tile.type) {
      case 'start':
        game.phase = 'end';
        break;

      case 'jail':
        // Just visiting
        game.phase = 'end';
        break;

      case 'go_to_jail':
        player.position = 10;
        player.jailTurns = 3;
        this.addEvent(game, player.id, 'go_to_jail', `${player.username} va a la Zona Castigada.`);
        game.phase = 'end';
        break;

      case 'free_parking':
        game.phase = 'end';
        break;

      case 'tax': {
        const amount = tile.amount ?? 100;
        if (player.taxShield) {
          player.taxShield = false;
          this.addEvent(game, player.id, 'tax_shield', `${player.username} evitó la multa con escudo.`);
        } else {
          this.chargePlayer(game, player, amount, 'tax');
        }
        game.phase = 'end';
        break;
      }

      case 'chaos_card':
        this.drawCard(game, player, 'chaos');
        break;

      case 'group_card':
        this.drawCard(game, player, 'group');
        break;

      case 'property':
      case 'party':
      case 'intercambiador':
      case 'special_property':
      case 'medical':
      case 'technology':
      case 'sports':
      case 'luxury_property': {
        // Mateo loses turn in party tiles
        if (player.characterId === 'mateo' && PARTY_GROUPS.includes(tile.group ?? '')) {
          player.skipNextTurn = true;
          this.addEvent(game, player.id, 'mateo_party', `${player.username} (Mateo) cayó en fiesta. Pierde el próximo turno.`);
        }

        const prop = game.properties.find((p) => p.id === tile.id);
        if (!prop) { game.phase = 'end'; break; }

        if (!prop.ownerId) {
          // Can buy
          if (tile.group === 'camila') {
            // Camila — free claim
            game.phase = 'buy';
            game.pendingAction = { type: 'buy', playerId: player.id };
          } else if (prop.price > 0) {
            game.phase = 'buy';
            game.pendingAction = { type: 'buy', playerId: player.id };
          } else {
            game.phase = 'end';
          }
        } else if (prop.ownerId !== player.id && !prop.mortgaged) {
          // Pay rent
          const rent = this.calculateRent(game, prop);
          if (player.rentShield) {
            player.rentShield = false;
            this.addEvent(game, player.id, 'rent_shield', `${player.username} evitó la renta con escudo.`);
          } else {
            this.payRent(game, player, prop.ownerId, rent);
          }
          game.phase = 'end';
        } else {
          game.phase = 'end';
        }
        break;
      }

      default:
        game.phase = 'end';
    }
  }

  // ── Rent Calculation ────────────────────────────────────────────────────
  private static calculateRent(game: GameState, prop: Property): number {
    if (prop.type === 'intercambiador') {
      const owned = game.properties.filter(
        (p) => p.type === 'intercambiador' && p.ownerId === prop.ownerId
      ).length;
      return INTERCAMBIADOR_RENTS[owned] ?? 25;
    }

    if (prop.hasHotel) return prop.rentWithHotel;
    if (prop.houses === 3) return prop.rentWithThreeHouses;
    if (prop.houses === 2) return prop.rentWithTwoHouses;
    if (prop.houses === 1) return prop.rentWithOneHouse;
    return prop.baseRent;
  }

  private static payRent(game: GameState, from: Player, toId: string, amount: number): void {
    const to = game.players.find((p) => p.id === toId);
    if (!to) return;

    const actual = Math.min(amount, from.money);
    from.money -= actual;
    to.money += actual;
    this.addEvent(game, from.id, 'rent_paid', `${from.username} pagó $${actual} de renta a ${to.username}.`);

    if (from.money <= 0) this.checkBankruptcy(game, from);
  }

  // ── Buy Property ────────────────────────────────────────────────────────
  static buyProperty(roomId: string, playerId: string): { game: GameState } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };
    if (game.currentPlayerId !== playerId) return { error: 'No es tu turno.' };
    if (game.phase !== 'buy') return { error: 'No es momento de comprar.' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Jugador no encontrado.' };

    const tile = BOARD_TILES[player.position];
    const prop = game.properties.find((p) => p.id === tile.id);
    if (!prop || !prop.canBeBought || prop.ownerId) return { error: 'No se puede comprar esta propiedad.' };

    const isCamila = tile.group === 'camila';
    const price = isCamila ? 0 : prop.price;

    if (player.money < price) return { error: `No tienes suficiente dinero. Necesitas $${price}.` };

    player.money -= price;
    prop.ownerId = playerId;
    player.properties.push(prop.id);

    if (isCamila) {
      this.addEvent(game, playerId, 'camila_claimed', `✨ ${player.username} reclamó a Camila gratuitamente. Evento histórico.`);
    } else {
      this.addEvent(game, playerId, 'property_bought', `${player.username} compró ${prop.name} por $${price}.`);
    }

    game.phase = 'end';
    game.pendingAction = undefined;
    activeGames.set(roomId, game);
    return { game };
  }

  static skipBuy(roomId: string, playerId: string): { game: GameState } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };
    if (game.currentPlayerId !== playerId) return { error: 'No es tu turno.' };
    game.phase = 'end';
    game.pendingAction = undefined;
    activeGames.set(roomId, game);
    return { game };
  }

  // ── Mortgage ────────────────────────────────────────────────────────────
  static mortgageProperty(roomId: string, playerId: string, propertyId: number): { game: GameState } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Jugador no encontrado.' };

    const prop = game.properties.find((p) => p.id === propertyId);
    if (!prop) return { error: 'Propiedad no encontrada.' };
    if (prop.ownerId !== playerId) return { error: 'No es tuya.' };
    if (!prop.canBeMortgaged) return { error: 'No se puede hipotecar.' };
    if (prop.mortgaged) return { error: 'Ya está hipotecada.' };

    prop.mortgaged = true;
    const value = Math.floor(prop.price / 2);
    player.money += value;
    this.addEvent(game, playerId, 'mortgaged', `${player.username} hipotecó ${prop.name} por $${value}.`);

    activeGames.set(roomId, game);
    return { game };
  }

  // ── Special Abilities ───────────────────────────────────────────────────
  static useAbility(
    roomId: string,
    playerId: string,
    abilityId: string,
    targetPlayerId?: string
  ): { game: GameState; message: string } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Jugador no encontrado.' };
    if (player.abilitiesDisabled) return { error: 'Tus habilidades están desactivadas esta ronda.' };

    const char = getCharacter(player.characterId);
    if (!char) return { error: 'Personaje no encontrado.' };

    const cooldownKey = abilityId;
    const cd = player.cooldowns[cooldownKey] ?? 0;
    if (cd > 0) return { error: `Habilidad en cooldown. Espera ${cd} turnos.` };

    let message = '';

    switch (abilityId) {
      case 'forcedTradeProposal': { // Arthur
        if (player.characterId !== 'arthur') return { error: 'Solo Arthur puede usar esto.' };
        const target = game.players.find((p) => p.id === targetPlayerId && !p.isBankrupt);
        if (!target) return { error: 'Objetivo inválido.' };
        game.pendingAction = {
          type: 'trade',
          playerId,
          data: { fromPlayerId: playerId, toPlayerId: targetPlayerId, forced: true },
        };
        player.cooldowns[cooldownKey] = char.cooldown;
        message = `Arthur propone un intercambio forzado a ${target.username}.`;
        break;
      }

      case 'hitPlayer': { // Luis
        if (player.characterId !== 'luis') return { error: 'Solo Luis puede usar esto.' };
        const target = game.players.find((p) => p.id === targetPlayerId && !p.isBankrupt && p.position === player.position);
        if (!target) return { error: 'El objetivo debe estar en tu misma casilla.' };
        target.skipNextTurn = true;
        player.cooldowns[cooldownKey] = char.cooldown;
        message = `Luis mandó a ${target.username} — No bro. Pierde el siguiente turno.`;
        break;
      }

      case 'cyberSteal': { // Mateo
        if (player.characterId !== 'mateo') return { error: 'Solo Mateo puede usar esto.' };
        const target = game.players.find((p) => p.id === targetPlayerId && !p.isBankrupt);
        if (!target) return { error: 'Objetivo inválido.' };
        const hackRoll = this.d6();
        if (hackRoll === 1) {
          this.chargePlayer(game, player, 20, 'hack_fail');
          message = `Mateo intentó hackear a ${target.username} pero falló (sacó 1). Paga $20.`;
        } else {
          const stolen = Math.min(10, target.money);
          target.money -= stolen;
          player.money += stolen;
          message = `Mateo hackeó a ${target.username} y robó $${stolen} (sacó ${hackRoll}).`;
        }
        player.cooldowns[cooldownKey] = char.cooldown;
        break;
      }

      case 'medicalCurse': { // Ariel
        if (player.characterId !== 'ariel') return { error: 'Solo Ariel puede usar esto.' };
        const target = game.players.find((p) => p.id === targetPlayerId && !p.isBankrupt && p.position === player.position);
        if (!target) return { error: 'El objetivo debe estar en tu misma casilla.' };
        // Target chooses: pay 50 or skip turn — default: pay
        this.chargePlayer(game, target, 50, 'medical_curse');
        player.cooldowns[cooldownKey] = char.cooldown;
        message = `Ariel maldijo a ${target.username} — paga $50 en medicamentos.`;
        break;
      }

      case 'dogAvoidPayment': { // José Vaca secondary
        if (player.characterId !== 'jose_vaca') return { error: 'Solo José Vaca puede usar esto.' };
        player.rentShield = true;
        player.cooldowns[cooldownKey] = char.cooldown;
        message = 'El perro de José Vaca evitará el próximo pago (hasta $100).';
        break;
      }

      default:
        return { error: `Habilidad desconocida: ${abilityId}` };
    }

    this.addEvent(game, playerId, 'ability_used', `${player.username}: ${message}`);
    activeGames.set(roomId, game);
    return { game, message };
  }

  // ── Cards ────────────────────────────────────────────────────────────────
  static drawCard(game: GameState, player: Player, deck: 'chaos' | 'group'): void {
    const deckArr = deck === 'chaos' ? game.chaosCardDeck : game.groupCardDeck;
    if (deckArr.length === 0) {
      const refill = deck === 'chaos' ? shuffleDeck(CHAOS_CARDS) : shuffleDeck(GROUP_CARDS);
      deckArr.push(...refill);
    }

    const card = deckArr.shift()!;
    game.lastCard = card;
    this.addEvent(game, player.id, 'card_drawn', `${player.username} saca carta: "${card.title}" — ${card.description}`);

    this.applyCardEffect(game, player, card);
  }

  private static applyCardEffect(game: GameState, player: Player, card: Card): void {
    switch (card.effectType) {
      case 'receive_money':
        player.money += card.amount ?? 0;
        break;

      case 'pay_bank':
        this.chargePlayer(game, player, card.amount ?? 0, 'card_pay');
        break;

      case 'skip_turn':
        player.skipNextTurn = true;
        break;

      case 'disable_abilities_all':
        game.players.forEach((p) => { if (!p.isBankrupt) p.abilitiesDisabled = true; });
        break;

      case 'collect_from_all': {
        const amount = card.amount ?? 0;
        game.players.forEach((p) => {
          if (p.id !== player.id && !p.isBankrupt) {
            const actual = Math.min(amount, p.money);
            p.money -= actual;
            player.money += actual;
          }
        });
        break;
      }

      case 'move_forward': {
        const steps = card.amount ?? 0;
        const newPos = (player.position + steps) % 40;
        if (newPos < player.position && player.characterId !== 'arthur') {
          player.money += 200;
          this.addEvent(game, player.id, 'passed_go', `${player.username} pasó por Salida y cobró $200.`);
        }
        player.position = newPos;
        this.resolveTile(game, player);
        return;
      }

      case 'move_backward': {
        const steps = card.amount ?? 0;
        player.position = ((player.position - steps) + 40) % 40;
        this.resolveTile(game, player);
        return;
      }

      case 'rent_shield':
        player.rentShield = true;
        break;

      case 'tax_shield':
        player.taxShield = true;
        break;

      case 'cancel_negative':
        player.skipNextTurn = false;
        player.abilitiesDisabled = false;
        player.jailTurns = 0;
        break;

      case 'richest_pays_player': {
        const richest = [...game.players]
          .filter((p) => !p.isBankrupt && p.id !== player.id)
          .sort((a, b) => b.money - a.money)[0];
        if (richest) {
          const amount = card.amount ?? 50;
          const actual = Math.min(amount, richest.money);
          richest.money -= actual;
          player.money += actual;
        }
        break;
      }

      case 'draw_again':
        this.drawCard(game, player, card.deck);
        return;

      case 'all_pay_bank': {
        const amount = card.amount ?? 30;
        game.players.forEach((p) => {
          if (!p.isBankrupt) this.chargePlayer(game, p, amount, 'card_all_pay');
        });
        break;
      }
    }

    game.phase = 'end';
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  private static chargePlayer(game: GameState, player: Player, amount: number, reason: string): void {
    player.money -= amount;
    if (player.money < 0) this.checkBankruptcy(game, player);
    this.addEvent(game, player.id, reason, `${player.username} pagó $${amount}.`);
  }

  private static checkBankruptcy(game: GameState, player: Player): void {
    if (player.money < 0 && !player.isBankrupt) {
      // Can they mortgage something?
      const unmortgaged = game.properties.filter((p) => p.ownerId === player.id && !p.mortgaged && p.canBeMortgaged);
      if (unmortgaged.length > 0) return; // Client should handle mortgage prompt
      player.isBankrupt = true;
      player.statuses = player.statuses.filter((s) => s !== 'active');
      player.statuses.push('bankrupt');
      // Release properties
      game.properties.forEach((p) => { if (p.ownerId === player.id) { p.ownerId = undefined; p.houses = 0; p.hasHotel = false; } });
      player.properties = [];
      this.addEvent(game, player.id, 'bankrupt', `💀 ${player.username} está en bancarrota y fue eliminado.`);
      this.checkWinner(game);
    }
  }

  static checkWinner(game: GameState): Player | undefined {
    const active = game.players.filter((p) => !p.isBankrupt);
    if (active.length === 1) {
      game.status = 'finished';
      game.winner = active[0];
      game.phase = 'end';
      this.addEvent(game, active[0].id, 'winner', `🏆 ¡${active[0].username} gana el Juego de Varones!`);
      return active[0];
    }
    return undefined;
  }

  private static applyDehividPassive(game: GameState, mover: Player): void {
    const dehivid = game.players.find((p) => p.characterId === 'dehivid' && !p.isBankrupt && p.id !== mover.id);
    if (dehivid && dehivid.position === mover.position) {
      mover.position = ((mover.position - 1) + 40) % 40;
      this.addEvent(game, dehivid.id, 'dehivid_push', `Dehivid empujó a ${mover.username} una casilla hacia atrás.`);
    }
  }

  private static checkCollisions(game: GameState, player: Player): void {
    const others = game.players.filter((p) => p.id !== player.id && !p.isBankrupt && p.position === player.position);
    for (const other of others) {
      this.addEvent(game, player.id, 'collision', `${player.username} cayó en la misma casilla que ${other.username}.`);
    }
  }

  // ── Turn Management ─────────────────────────────────────────────────────
  static nextTurn(roomId: string, playerId: string): { game: GameState } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };
    if (game.currentPlayerId !== playerId) return { error: 'No es tu turno.' };
    if (game.phase !== 'end') return { error: 'El turno no ha terminado.' };
    if (game.status === 'finished') return { game };

    // Reduce cooldowns for current player
    const currentPlayer = game.players.find((p) => p.id === playerId);
    if (currentPlayer) {
      for (const key of Object.keys(currentPlayer.cooldowns)) {
        if (currentPlayer.cooldowns[key] > 0) currentPlayer.cooldowns[key] -= 1;
      }
      // Reset per-turn flags
      currentPlayer.abilitiesDisabled = false;
    }

    // Find next active player
    let nextIndex = game.currentPlayerIndex;
    let attempts = 0;
    do {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    } while (game.players[nextIndex].isBankrupt && attempts < game.players.length);

    if (attempts >= game.players.length) {
      game.status = 'finished';
      activeGames.set(roomId, game);
      return { game };
    }

    game.currentPlayerIndex = nextIndex;
    const nextPlayer = game.players[nextIndex];
    game.currentPlayerId = nextPlayer.id;
    game.turn += 1;
    game.lastCard = undefined;
    game.lastDice = undefined;
    game.pendingAction = undefined;

    // Handle jail
    if (nextPlayer.jailTurns > 0) {
      nextPlayer.jailTurns -= 1;
      if (nextPlayer.jailTurns > 0) {
        nextPlayer.skipNextTurn = true;
        this.addEvent(game, nextPlayer.id, 'jail', `${nextPlayer.username} sigue en la Zona Castigada (${nextPlayer.jailTurns} turnos restantes).`);
      }
    }

    // Skip turn
    if (nextPlayer.skipNextTurn) {
      nextPlayer.skipNextTurn = false;
      this.addEvent(game, nextPlayer.id, 'skip_turn', `${nextPlayer.username} pierde su turno.`);
      // Recursively advance
      game.phase = 'end';
      activeGames.set(roomId, game);
      return this.nextTurn(roomId, nextPlayer.id);
    }

    game.phase = 'roll';
    activeGames.set(roomId, game);
    return { game };
  }

  // ── Declarar Bancarrota ─────────────────────────────────────────────────
  static declareBankruptcy(roomId: string, playerId: string): { game: GameState } | { error: string } {
    const game = activeGames.get(roomId);
    if (!game) return { error: 'Juego no encontrado.' };
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'Jugador no encontrado.' };
    this.checkBankruptcy(game, player);
    game.phase = 'end';
    activeGames.set(roomId, game);
    return { game };
  }

  // ── Utils ────────────────────────────────────────────────────────────────
  private static addEvent(game: GameState, playerId: string, type: string, message: string): void {
    const player = game.players.find((p) => p.id === playerId);
    const event: GameEvent = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      playerId,
      playerName: player?.username ?? 'Sistema',
      type,
      message,
    };
    game.events.unshift(event);
    if (game.events.length > 100) game.events.pop();
  }
}
