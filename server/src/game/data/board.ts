import { BoardTile, Property } from '../../../shared/types/index';

export const BOARD_TILES: BoardTile[] = [
  { id: 0, name: 'Salida', type: 'start' },
  { id: 1, name: 'Departamento de José', type: 'property', price: 60, rent: 2, group: 'barato' },
  { id: 2, name: 'Cuerpo Paula', type: 'property', price: 60, rent: 4, group: 'barato' },
  { id: 3, name: 'Carta del Grupo', type: 'group_card' },
  { id: 4, name: 'Cooperación Obligatoria', type: 'tax', amount: 100 },
  { id: 5, name: 'Intercambiador Norte', type: 'intercambiador', price: 200 },
  { id: 6, name: 'Previa del Grupo', type: 'party', price: 100, rent: 6, group: 'fiesta' },
  { id: 7, name: 'Carta de Caos', type: 'chaos_card' },
  { id: 8, name: 'Tienda de Salchipapas', type: 'property', price: 100, rent: 6, group: 'comida' },
  { id: 9, name: 'Esquina del Chisme', type: 'property', price: 120, rent: 8, group: 'chisme' },
  { id: 10, name: 'Zona Castigada', type: 'jail' },
  { id: 11, name: 'Discoteca No Había Para Hombre', type: 'party', price: 140, rent: 10, group: 'fiesta' },
  { id: 12, name: 'La Prima del Inge', type: 'special_property', price: 140, rent: 10, group: 'especial' },
  { id: 13, name: 'Hospital de Ariel', type: 'medical', price: 150, rent: 12, group: 'medico' },
  { id: 14, name: 'Bar No Bro', type: 'party', price: 160, rent: 12, group: 'fiesta' },
  { id: 15, name: 'Intercambiador Sur', type: 'intercambiador', price: 200 },
  { id: 16, name: 'Camila', type: 'special_property', price: 0, rent: 25, group: 'camila' },
  { id: 17, name: 'Carta del Grupo', type: 'group_card' },
  { id: 18, name: 'After de Mateo', type: 'party', price: 180, rent: 14, group: 'fiesta' },
  { id: 19, name: 'Terraza del José', type: 'party', price: 180, rent: 14, group: 'fiesta' },
  { id: 20, name: 'Parking Gratis', type: 'free_parking' },
  { id: 21, name: 'Club Soy Dios', type: 'party', price: 220, rent: 18, group: 'fiesta' },
  { id: 22, name: 'Carta de Caos', type: 'chaos_card' },
  { id: 23, name: 'Laboratorio Hacker de Mateo', type: 'technology', price: 220, rent: 18, group: 'tecnologia' },
  { id: 24, name: 'Evelyn el Amor', type: 'special_property', price: 240, rent: 20, group: 'especial' },
  { id: 25, name: 'Intercambiador Valle', type: 'intercambiador', price: 200 },
  { id: 26, name: 'Cancha de la Lesión', type: 'sports', price: 260, rent: 22, group: 'deporte' },
  { id: 27, name: 'Lounge No Bro', type: 'party', price: 260, rent: 22, group: 'fiesta' },
  { id: 28, name: 'Farmacia de la Pomada', type: 'medical', price: 280, rent: 24, group: 'medico' },
  { id: 29, name: 'La Prima del José', type: 'special_property', price: 280, rent: 24, group: 'especial' },
  { id: 30, name: 'Ve a la Zona Castigada', type: 'go_to_jail' },
  { id: 31, name: 'After de las 3 AM', type: 'party', price: 300, rent: 26, group: 'fiesta' },
  { id: 32, name: 'Carta del Grupo', type: 'group_card' },
  { id: 33, name: 'Mansión del Chisme', type: 'property', price: 320, rent: 28, group: 'lujo' },
  { id: 34, name: 'Discoteca VIP', type: 'party', price: 320, rent: 28, group: 'lujo' },
  { id: 35, name: 'Intercambiador Final', type: 'intercambiador', price: 200 },
  { id: 36, name: 'Carta de Caos Premium', type: 'chaos_card' },
  { id: 37, name: 'Compra de Hombre', type: 'property', price: 350, rent: 35, group: 'premium' },
  { id: 38, name: 'Licorería de Homero', type: 'luxury_property', price: 380, rent: 45, group: 'premium' },
  { id: 39, name: 'Trono de Varones', type: 'luxury_property', price: 400, rent: 50, group: 'premium' },
];

// Rent multipliers by intercambiador count
export const INTERCAMBIADOR_RENTS: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

// IDs of purchasable tiles
export const PURCHASABLE_TYPES: BoardTile['type'][] = [
  'property', 'party', 'intercambiador', 'special_property',
  'medical', 'technology', 'sports', 'luxury_property',
];

// Groups where Mateo loses his turn (party tiles)
export const PARTY_GROUPS = ['fiesta'];

export function createInitialProperties(): Property[] {
  return BOARD_TILES.filter((t) => PURCHASABLE_TYPES.includes(t.type)).map((t) => {
    const base = t.rent ?? 0;
    const isCamila = t.group === 'camila';
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      group: t.group ?? 'none',
      price: t.price ?? 0,
      baseRent: base,
      rentWithOneHouse: Math.round(base * 2.5),
      rentWithTwoHouses: Math.round(base * 5),
      rentWithThreeHouses: Math.round(base * 8),
      rentWithHotel: Math.round(base * 12),
      ownerId: undefined,
      mortgaged: false,
      houses: 0,
      hasHotel: false,
      canBeBought: true,
      canBeMortgaged: !isCamila,
      canBeUpgraded: !isCamila && t.type !== 'intercambiador',
    };
  });
}
