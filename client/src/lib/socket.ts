import { io, type Socket } from 'socket.io-client';

let socketRef: Socket | null = null;

export const connectSocket = (token: string) => {
  if (socketRef) return socketRef;

  const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  const origin = baseUrl.replace(/\/api\/v1\/?$/, '');

  socketRef = io(origin, {
    transports: ['websocket'],
    auth: { token },
  });

  return socketRef;
};

export const getSocket = () => socketRef;

export const disconnectSocket = () => {
  if (!socketRef) return;
  socketRef.disconnect();
  socketRef = null;
};
