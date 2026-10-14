const { Server } = require('socket.io');
const config = require('./config');

let io = null;

function init(server) {
  io = new Server(server, {
    cors: { origin: config.clientOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // Clients can join rooms but for simplicity we broadcast globally.
    socket.on('identify', (role) => {
      socket.join(role || 'public');
    });
  });

  return io;
}

function getIO() {
  return io;
}

function broadcast(event, payload) {
  if (io) io.emit(event, payload);
}

module.exports = { init, getIO, broadcast };