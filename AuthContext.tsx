import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { auth, db, messaging } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { toast } from '../lib/toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (cpf: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// E-mail da conta master do desenvolvedor. As permissões reais dessa conta são
// garantidas pelas REGRAS do Firestore (isMasterAdmin) — este valor no cliente
// serve apenas para reconstruir o perfil se o documento for apagado por engano.
const MASTER_EMAIL = 'jhonatanmbarbosa27@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (val) => {
      setUser(val);
      if (val) {
        try {
          const docRef = doc(db, 'users', val.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;

            // Conta desativada: encerra a sessão imediatamente
            if (data.ativo === false) {
              await signOut(auth);
              toast('Acesso bloqueado. Procure a recepção da academia.', 'error');
              setProfile(null);
              setLoading(false);
              return;
            }

            if (val.email === MASTER_EMAIL && data.role !== 'admin') {
              const upgradedProfile = { ...data, uid: val.uid, role: 'admin' as UserRole };
              setProfile(upgradedProfile);
              // Só funciona porque as regras do Firestore reconhecem isMasterAdmin
              try {
                await setDoc(docRef, { role: 'admin' }, { merge: true });
              } catch (e) {
                console.error('Falha ao restaurar conta master no Firestore:', e);
              }
            } else {
              setProfile({ uid: val.uid, ...data } as UserProfile);
            }
          } else if (val.email === MASTER_EMAIL) {
            // Recria o perfil master caso o documento não exista
            const masterProfile: UserProfile = {
              uid: val.uid,
              name: 'Administrador Master',
              cpf: '00000000000',
              role: 'admin',
              primeiro_acesso: false
            };
            setProfile(masterProfile);
            try {
              await setDoc(doc(db, 'users', val.uid), masterProfile, { merge: true });
            } catch (e) {
              console.warn('Não foi possível recriar o documento master', e);
            }
          }
        } catch (docError) {
          console.error('Erro ao carregar perfil:', docError);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && profile && messaging && typeof window !== 'undefined') {
      const handleToken = async () => {
        try {
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const currentToken = await getToken(messaging, {
                vapidKey: 'BMpnqY52wERR4Wb8NGC_vAxWrzVd-hKJNV5IcD4a9S_JHSOpPRdpfL0UDjObi0qJy79ddcojqOj0V3St3ydTIXQ'
              });

              if (currentToken && profile.fcmToken !== currentToken) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { fcmToken: currentToken });
                setProfile(prev => prev ? { ...prev, fcmToken: currentToken } : null);
              }
            }
          }
        } catch (err) {
          console.log('FCM Token Error:', err);
        }
      };

      handleToken();
    }
  }, [user, profile?.fcmToken]);

  const login = async (cpfInput: string, pass: string) => {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    const email = `${cleanCpf}@multyforcas.com.br`;

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error('Login attempt failed:', err.code);

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        throw new Error('CPF ou Senha incorretos.');
      }

      if (err.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      }

      throw new Error('Erro ao realizar login. Tente novamente.');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, data, { merge: true });
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
