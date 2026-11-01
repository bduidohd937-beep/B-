import React from 'react';
import { createRoot } from 'react-dom/client';
import FirstRoom from './FirstRoom.jsx';
import './room.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><FirstRoom /></React.StrictMode>
);
