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
  // NOTE: Claims fetching often requires async call. For simplicity, we might default isAdmin to false initially
  // and update it in useEffect. Or we can just include the logic to parse the result.
  const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    let isAdmin = false;
    try {
      // FORCE refresh to get the latest custom claims (important after promotion)
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      console.log("Auth Debug - Claims:", tokenResult.claims);
      isAdmin = !!tokenResult.claims.admin;
    } catch (e) {
      console.error("Error fetching claims:", e);
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || null,
      photoURL: firebaseUser.photoURL || null,
      isAdmin
    };
  };

  const login = useCallback(async (formData: LoginFormData): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const convertedUser = await convertFirebaseUser(userCredential.user);
      setUser(convertedUser);
      return true;
    } catch (error) {
      const firebaseAuthError = error as AuthError;
      console.error('Errore login:', firebaseAuthError.code, error);

      // Gestione errori Firebase
      switch (firebaseAuthError.code) {
        case 'auth/user-not-found':
          setAuthError('Utente non trovato');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
          setAuthError('Email o password non corretti');
          break;
        case 'auth/invalid-email':
          setAuthError('Email non valida');
          break;
        case 'auth/user-disabled':
          setAuthError('Account disabilitato');
          break;
        case 'auth/too-many-requests':
          setAuthError('Troppi tentativi. Riprova piu tardi');
          break;
        case 'auth/network-request-failed':
          setAuthError('Errore di rete durante il login');
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force token refresh to ensure claims are up to date if they just changed
        // await firebaseUser.getIdToken(true); 
        const convertedUser = await convertFirebaseUser(firebaseUser);
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



