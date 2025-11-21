
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PlanConfig, PlanType, AppNotification } from '../types';
import { StorageService } from '../services/storage';
import { notificationService } from '../services/notificationService';
import { supabase } from '../services/supabase';

interface AppContextProps {
  user: User | null;
  plans: Record<PlanType, PlanConfig>;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => void;
  updatePlans: (newPlans: Record<PlanType, PlanConfig>) => void;
  notifications: AppNotification[];
  refreshNotifications: () => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Record<PlanType, PlanConfig>>({} as any);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPlans(StorageService.getPlanConfigs());
    
    const initSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                const profile = await StorageService.getCurrentUser(session.user.id);
                setUser(profile);
                if (profile) {
                    setNotifications(StorageService.getNotifications(profile.id));
                    notificationService.requestPermission();
                    notificationService.startService(profile);
                }
            }
        } catch (err) {
            console.warn("Supabase initialization failed (offline or unconfigured):", err);
        } finally {
            setIsLoading(false);
        }
    };

    initSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
            if (session?.user) {
                const profile = await StorageService.getCurrentUser(session.user.id);
                setUser(profile);
            } else {
                setUser(null);
                notificationService.stopService();
            }
        } catch (e) {
            console.error("Auth state change error:", e);
        }
        setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Login error:", e);
        throw e;
    }
  };

  const logout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Logout error:", e);
    }
    setUser(null);
  };

  const refreshUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const profile = await StorageService.getCurrentUser(session.user.id);
            setUser(profile);
        }
      } catch (e) {
          console.error("Refresh user error:", e);
      }
  };

  const refreshNotifications = () => {
      if (user) {
          setNotifications(StorageService.getNotifications(user.id));
      }
  }

  const updatePlans = (newPlans: Record<PlanType, PlanConfig>) => {
      // Plans are static in this implementation for simplicity
      setPlans(newPlans);
  };

  return (
    <AppContext.Provider value={{ user, plans, login, logout, refreshUser, updatePlans, notifications, refreshNotifications, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
