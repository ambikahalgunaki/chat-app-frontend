import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';
let socket = null;

export const connectSocket = (userId) => {
  socket = io(SOCKET_URL, { transports: ['websocket'] });
  socket.on('connect', () => {
    socket.emit('join', userId);
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};