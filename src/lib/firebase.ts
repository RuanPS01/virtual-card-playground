import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuração web do Firebase. Estes valores identificam o projeto e não são
// segredo: a proteção dos dados fica nas regras do Realtime Database.
const firebaseConfig = {
  apiKey: 'AIzaSyAQdLCw8JPfRfZJdHgjsM9CFArbHWL-SCQ',
  authDomain: 'virtual-card-playground.firebaseapp.com',
  databaseURL: 'https://virtual-card-playground-default-rtdb.firebaseio.com',
  projectId: 'virtual-card-playground',
  storageBucket: 'virtual-card-playground.firebasestorage.app',
  messagingSenderId: '1095507757324',
  appId: '1:1095507757324:web:e03d82d3aa60188d926129',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
