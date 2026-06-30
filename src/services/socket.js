import { io } from 'socket.io-client';

// ✅ CHANGE THIS to your Render URL
const SOCKET_URL = 'https://chat-app-backend-nw6m.onrender.com';
let socket = null;

export const connectSocket = (userId) => {
  if (socket && socket.connected) {
    return socket;
  }
  
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(SOCKET_URL, { 
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  socket.on('connect', () => {
    console.log('Socket connected successfully');
    socket.emit('join', userId);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not connected. Call connectSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};