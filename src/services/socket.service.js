import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

let socket = null;

const connect = () => {
  if (socket && socket.connected) return socket;
  const token = getAuthToken();
  socket = io(window.location.origin, { auth: { token } });
  return socket;
};

const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const joinRoom = (room) => {
  const s = connect();
  s.emit('join', room);
};

const leaveRoom = (room) => {
  if (!socket) return;
  socket.emit('leave', room);
};

const on = (event, cb) => {
  const s = connect();
  s.on(event, cb);
};

const off = (event, cb) => {
  if (!socket) return;
  socket.off(event, cb);
};

export default { connect, disconnect, joinRoom, leaveRoom, on, off };
