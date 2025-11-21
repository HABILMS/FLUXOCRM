
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PlanConfig, PlanType, UserRole, AppNotification } from '../types';
import { StorageService } from '../services/storage';
import { notificationService } from '../services/notificationService';

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
    StorageService.init();
    setPlans(StorageService.getPlanConfigs());
    const currentUser = StorageService.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
        setNotifications(StorageService.getNotifications(currentUser.id));
        notificationService.requestPermission();
        notificationService.startService(currentUser);
    }
    setIsLoading(false);

    return () => {
        notificationService.stopService();
    }
  }, []);

  // Watch for user changes to restart notification service
  useEffect(() => {
      if (user) {
          notificationService.startService(user);
          setNotifications(StorageService.getNotifications(user.id));
      } else {
          notificationService.stopService();
          setNotifications([]);
      }
  }, [user]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const users = StorageService.getUsers();
    const found = users.find(u => u.email === email && u.password === pass && u.isActive);
    if (found) {
      setUser(found);
      StorageService.setCurrentUser(found.id);
      notificationService.requestPermission();
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    StorageService.setCurrentUser(null);
  };

  const refreshUser = () => {
      const currentUser = StorageService.getCurrentUser();
      setUser(currentUser);
      setPlans(StorageService.getPlanConfigs());
  };

  const refreshNotifications = () => {
      if (user) {
          setNotifications(StorageService.getNotifications(user.id));
      }
  }

  const updatePlans = (newPlans: Record<PlanType, PlanConfig>) => {
      StorageService.savePlanConfigs(newPlans);
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
