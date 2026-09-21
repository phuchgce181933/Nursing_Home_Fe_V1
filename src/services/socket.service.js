import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

let socket = null;

const connect = () => {
  // Reuse the instance as soon as it exists — not only once `.connected` is true.
  // Callers (MessagesPage) invoke connect()/on() several times synchronously on
  // mount, before the very first handshake has had a chance to complete; gating on
  // `.connected` made each of those calls think there was "no socket yet" and spin
  // up a brand new client, silently abandoning the previous one along with whatever
  // listener had just been attached to it (so some 'notification:*' listeners never
  // fired). socket.io-client fully supports registering listeners pre-connect.
  if (socket) return socket;
  const token = getAuthToken();
  // Same reasoning as axiosClient: same-origin only works in dev, where Vite proxies
  // /socket.io to the local backend. In production the API lives on a different domain.
  const socketUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  socket = io(socketUrl, { auth: { token } });
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
