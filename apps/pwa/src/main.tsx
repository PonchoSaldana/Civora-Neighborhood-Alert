import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles/index.css';
import { amplifyConfig, isAwsConfigured } from './config/aws.js';

// Inicializar Amplify sólo si hay credenciales reales configuradas
if (isAwsConfigured) {
  import('aws-amplify').then(({ Amplify }) => {
    Amplify.configure(amplifyConfig as any);
  }).catch((e) => {
    console.warn('[Civora] No se pudo inicializar Amplify:', e);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

