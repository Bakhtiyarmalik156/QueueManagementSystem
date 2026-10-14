import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function onEvent(event, cb) {
  const s = getSocket();
  s.on(event, cb);
  return () => s.off(event, cb);
}