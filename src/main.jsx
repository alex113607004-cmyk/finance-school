import React from 'react';import{createRoot}from'react-dom/client';import App from './App.jsx';import './styles.css';
import {MarketDataProvider} from './MarketDataContext.jsx';
createRoot(document.getElementById('root')).render(<React.StrictMode><MarketDataProvider><App/></MarketDataProvider></React.StrictMode>);
