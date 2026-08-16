'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@zylo.com.np');
  const [password, setPassword] = useState('changeme123');

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push('/admin/dashboard');
  };

  return (
    <div className="login-card">
      <p className="brand">Zylo</p>
      <h1>Sign in to admin</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          Sign in
        </button>
      </form>
      <p className="hint">
        Sign-in opens the admin dashboard. Data is synced with central store.
      </p>
    </div>
  );
}
