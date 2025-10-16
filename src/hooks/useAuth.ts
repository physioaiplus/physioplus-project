import { useState, useCallback, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth } from '../config/firebase';
import type { User, LoginFormData } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Converte Firebase User in User del nostro tipo
  const convertFirebaseUser = (firebaseUser: FirebaseUser): User => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || null,
    photoURL: firebaseUser.photoURL || null
  });

  const login = useCallback(async (formData: LoginFormData): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const convertedUser = convertFirebaseUser(userCredential.user);
      setUser(convertedUser);
      return true;
    } catch (error) {
      console.error('Errore login:', error);
      
      // Gestione errori Firebase
      const authError = error as AuthError;
      switch (authError.code) {
        case 'auth/user-not-found':
          setAuthError('Utente non trovato');
          break;
        case 'auth/wrong-password':
          setAuthError('Password errata');
          break;
        case 'auth/invalid-email':
          setAuthError('Email non valida');
          break;
        case 'auth/user-disabled':
          setAuthError('Account disabilitato');
          break;
        case 'auth/too-many-requests':
          setAuthError('Troppi tentativi. Riprova più tardi');
          break;
        default:
          setAuthError('Errore di autenticazione');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.error('Errore logout:', error);
    }
  }, []);

  // Listener per i cambiamenti dello stato di autenticazione
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const convertedUser = convertFirebaseUser(firebaseUser);
        setUser(convertedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = user !== null;

  return {
    user,
    isLoading,
    isAuthenticated,
    authError,
    login,
    logout,
    setAuthError
  };
};

