// Geração de identificadores. Só letras minúsculas e dígitos: o Firebase
// Realtime Database proíbe ". $ # [ ] /" em chaves, e os ids viram chaves.

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Sem 0/O, 1/I/L: o código da sala é ditado em voz alta e digitado no celular.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 6;

const pick = (alphabet: string, length: number, rng: () => number): string => {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return out;
};

export const newId = (rng: () => number = Math.random): string => pick(ID_ALPHABET, 12, rng);

export const newRoomCode = (rng: () => number = Math.random): string =>
  pick(ROOM_ALPHABET, ROOM_CODE_LENGTH, rng);

export const normalizeRoomCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
