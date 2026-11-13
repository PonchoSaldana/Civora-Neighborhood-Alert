import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './styles/index.css';
import { amplifyConfig, isAwsConfigured } from './config/aws.js';

// Inicializar Amplify sólo si hay credenciales reales configuradas
if (isAwsConfigured) {
  import('aws-amplify').then(({ Amplify }) => {
    Amplify.configure(amplifyConfig as any);
    console.info('[Civora] AWS Amplify configurado con User Pool y API Gateway reales.');
  }).catch((e) => {
    console.warn('[Civora] No se pudo inicializar Amplify:', e);
  });
} else {
  console.info('[Civora] Modo demo local — sin credenciales AWS. Para conectar AWS, configura las variables en .env.local según .env.example.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

