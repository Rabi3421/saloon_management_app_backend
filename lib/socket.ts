import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from './jwt';

let io: Server | null = null;

export async function startSocketServer() {
  if (io) return;

  const port = Number(process.env.SOCKET_PORT || 4001);
  const httpServer = createServer();

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Simple auth middleware via JWT token in handshake (auth or query)
  io.use((socket, next) => {
    const token = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.query && socket.handshake.query.token) || null;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyToken(String(token));
      // attach parsed payload for later
      (socket as any).user = payload;
      return next();
    } catch (e) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    // join salon room if present
    if (user?.salonId) {
      socket.join(`salon:${user.salonId}`);
    }
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // log new connection for debugging
    try {
      // eslint-disable-next-line no-console
      console.log('Socket connected:', { userId: user?.userId, salonId: user?.salonId, role: user?.role });
    } catch (e) {}

    socket.on('joinSalon', (salonId: string) => {
      if (salonId) socket.join(`salon:${salonId}`);
    });
  });

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Socket server listening on port ${port}`);
  });
}

export function emitToSalon(salonId: string | null | undefined, event: string, payload: unknown) {
  if (!io || !salonId) return;
  io.to(`salon:${salonId}`).emit(event, payload);
}

export function emitToUser(userId: string | null | undefined, event: string, payload: unknown) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export default {
  startSocketServer,
  emitToSalon,
  emitToUser,
};
