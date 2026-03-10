import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [latestData, setLatestData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('sensorUpdate', (data) => {
      setLatestData(data);
    });

    socket.on('newAlerts', (newAlerts) => {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
    });

    return () => { socket.disconnect(); };
  }, []);

  return { latestData, alerts, connected, socket: socketRef.current };
}
