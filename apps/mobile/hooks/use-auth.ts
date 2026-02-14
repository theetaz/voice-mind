import React from 'react';
import { AuthContext, type AuthContextType } from '@/lib/auth-context';

export function useAuth(): AuthContextType {
  const context = React.use(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
