import React from 'react';
import logo from '../assets/logo.png';

const Welcome = ({ onLogin, onRegister }) => (
  <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center gap-8 p-6">
    <div className="flex flex-col items-center gap-6 w-full max-w-xs">
      <img src={logo} alt="K-POINT OF SALES" className="h-16 object-contain bg-white rounded-xl px-4 py-2 w-full" />
      <div className="text-center">
        <h1 className="text-2xl font-800 text-text-primary tracking-tight">K-POINT OF SALES</h1>
        <p className="text-sm text-text-muted mt-1">Professional POS for Lesotho Supermarkets</p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <button onClick={onLogin}    className="k-btn-primary w-full py-3.5 text-sm">Sign in to your account</button>
        <button onClick={onRegister} className="k-btn-outline  w-full py-3.5 text-sm">Create new account</button>
      </div>
      <p className="text-xs text-text-faint text-center">K-POINT OF SALES v1.0 · Maseru, Lesotho</p>
    </div>
  </div>
);

export default Welcome;
