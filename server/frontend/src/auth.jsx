import React, {createContext, useContext, useEffect, useState} from 'react';
import {api} from './api';
const Auth = createContext(null);
export const useAuth = () => useContext(Auth);
export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {api('session').then(data => setUser(data.authenticated ? data : null)).finally(() => setLoading(false));}, []);
  return <Auth.Provider value={{user, setUser, loading}}>{children}</Auth.Provider>;
}
