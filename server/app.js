const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Servir arquivos estáticos

let rooms = {}; // Objeto para armazenar o histórico de cada sala
let users = {}; // Objeto para armazenar o nome de usuário associado ao socket

// Eventos de conexão com Socket.IO
io.on('connection', (socket) => {
  console.log('Novo usuário conectado');

  // Definir nome de usuário
  socket.on('setUsername', (username) => {
    users[socket.id] = username;
    console.log(`Usuário ${username} se conectou`);
  });

  // Enviar a lista de salas cadastradas
  socket.emit('roomsList', Object.keys(rooms));

  // Entrar em uma sala
  socket.on('joinRoom', (room) => {
    socket.join(room);
    socket.currentRoom = room;
    console.log(`Usuário ${users[socket.id]} entrou na sala ${room}`);

    // Enviar histórico da sala
    if (rooms[room]) {
      rooms[room].forEach(msg => {
        socket.emit('message', msg); // Envia apenas as mensagens da sala atual
      });
    }
  });

  // Enviar mensagem
  socket.on('chatMessage', (msg) => {
    const username = users[socket.id] || 'Usuário Desconhecido'; // Pega o nome de usuário ou 'Desconhecido'

    // Armazenar a mensagem no histórico da sala
    if (!rooms[socket.currentRoom]) {
      rooms[socket.currentRoom] = [];
    }
    const messageWithUser = { username, message: msg }; // Mensagem com nome do usuário
    rooms[socket.currentRoom].push(messageWithUser);

    // Emitir a mensagem para todos na sala
    io.to(socket.currentRoom).emit('message', messageWithUser);
  });

  // Cadastrar nova sala
  socket.on('createRoom', (room) => {
    if (!rooms[room]) {
      rooms[room] = [];
      io.emit('roomsList', Object.keys(rooms)); // Atualiza a lista de salas para todos
      console.log(`Nova sala criada: ${room}`);
    }
  });

  // Sair da sala
  socket.on('leaveRoom', () => {
    socket.leave(socket.currentRoom);
    console.log(`Usuário ${users[socket.id]} saiu da sala ${socket.currentRoom}`);
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
  });
});

// Inicializar servidor
server.listen(3000, () => console.log('Servidor rodando na porta 3000'));
