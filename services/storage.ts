
import { User, Contact, Opportunity, Expense, Activity, PlanType, UserRole, PlanConfig, OpportunityStatus, AppNotification, UserSettings, BotConfig } from '../types';

const STORAGE_KEYS = {
  USERS: 'fluxo_users',
  CONTACTS: 'fluxo_contacts',
  OPPORTUNITIES: 'fluxo_opportunities',
  EXPENSES: 'fluxo_expenses',
  ACTIVITIES: 'fluxo_activities',
  PLAN_CONFIGS: 'fluxo_plan_configs',
  CURRENT_USER_ID: 'fluxo_current_user_id',
  NOTIFICATIONS: 'fluxo_notifications',
  USER_SETTINGS: 'fluxo_user_settings',
  BOT_CONFIG: 'fluxo_bot_config'
};

// Initial Seed Data
const DEFAULT_PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.BASIC]: {
    type: PlanType.BASIC,
    name: 'Básico',
    price: 29.90,
    maxContacts: 10,
    maxOpportunities: 5,
    features: { expenses: false, aiAssistant: false, voiceCommands: false }
  },
  [PlanType.ADVANCED]: {
    type: PlanType.ADVANCED,
    name: 'Avançado',
    price: 59.90,
    maxContacts: -1,
    maxOpportunities: -1,
    features: { expenses: true, aiAssistant: false, voiceCommands: false }
  },
  [PlanType.EXPERT]: {
    type: PlanType.EXPERT,
    name: 'Expert',
    price: 99.90,
    maxContacts: -1,
    maxOpportunities: -1,
    features: { expenses: true, aiAssistant: true, voiceCommands: true }
  }
};

const SEED_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Administrador',
    email: 'admin@fluxo.com',
    password: 'admin',
    role: UserRole.ADMIN,
    plan: PlanType.EXPERT,
    isActive: true,
    avatar: 'https://picsum.photos/150/150?random=1'
  },
  {
    id: 'user-1',
    name: 'João Silva (Basic)',
    email: 'joao@client.com',
    password: '123',
    role: UserRole.USER,
    plan: PlanType.BASIC,
    isActive: true,
    avatar: 'https://picsum.photos/150/150?random=2'
  },
  {
    id: 'user-2',
    name: 'Maria Souza (Expert)',
    email: 'maria@client.com',
    password: '123',
    role: UserRole.USER,
    plan: PlanType.EXPERT,
    isActive: true,
    avatar: 'https://picsum.photos/150/150?random=3'
  }
];

// Helper to get data
const get = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

// Helper to set data
const set = <T>(key: string, val: T) => {
  localStorage.setItem(key, JSON.stringify(val));
};

export const StorageService = {
  // Initialization
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      set(STORAGE_KEYS.USERS, SEED_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAN_CONFIGS)) {
      set(STORAGE_KEYS.PLAN_CONFIGS, DEFAULT_PLANS);
    }
    // Seed fake data for dashboard visualization if empty
    if (!localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES)) {
       const ops: Opportunity[] = [
         { id: 'op1', userId: 'user-2', contactId: 'c1', contactName: 'Acme Corp', product: 'Consultoria', value: 5000, status: OpportunityStatus.WON, createdAt: new Date().toISOString() },
         { id: 'op2', userId: 'user-2', contactId: 'c2', contactName: 'Globex', product: 'Treinamento', value: 2500, status: OpportunityStatus.OPEN, createdAt: new Date().toISOString() }
       ];
       set(STORAGE_KEYS.OPPORTUNITIES, ops);
    }
  },

  // Users
  getUsers: (): User[] => get(STORAGE_KEYS.USERS, []),
  saveUser: (user: User) => {
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    const existing = users.findIndex(u => u.id === user.id);
    if (existing >= 0) {
      users[existing] = user;
    } else {
      users.push(user);
    }
    set(STORAGE_KEYS.USERS, users);
  },
  deleteUser: (id: string) => {
      const users = get<User[]>(STORAGE_KEYS.USERS, []);
      set(STORAGE_KEYS.USERS, users.filter(u => u.id !== id));
  },

  // Plans
  getPlanConfigs: (): Record<PlanType, PlanConfig> => get(STORAGE_KEYS.PLAN_CONFIGS, DEFAULT_PLANS),
  savePlanConfigs: (configs: Record<PlanType, PlanConfig>) => set(STORAGE_KEYS.PLAN_CONFIGS, configs),

  // Contacts
  getContacts: (userId: string): Contact[] => {
    const all = get<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    return all.filter(c => c.userId === userId);
  },
  saveContact: (contact: Contact) => {
    const all = get<Contact[]>(STORAGE_KEYS.CONTACTS, []);
    const existing = all.findIndex(c => c.id === contact.id);
    if (existing >= 0) all[existing] = contact;
    else all.push(contact);
    set(STORAGE_KEYS.CONTACTS, all);
  },

  // Opportunities
  getOpportunities: (userId: string): Opportunity[] => {
    const all = get<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);
    return all.filter(o => o.userId === userId);
  },
  saveOpportunity: (opp: Opportunity) => {
    const all = get<Opportunity[]>(STORAGE_KEYS.OPPORTUNITIES, []);
    const existing = all.findIndex(o => o.id === opp.id);
    
    // Check if status changed to WON to auto-create income
    if (existing >= 0) {
        const oldOpp = all[existing];
        if (oldOpp.status !== OpportunityStatus.WON && opp.status === OpportunityStatus.WON) {
            StorageService.addIncomeFromOpportunity(opp);
            StorageService.createNotification(opp.userId, 'Venda Fechada!', `Parabéns! Você fechou a oportunidade com ${opp.contactName}.`, 'OPPORTUNITY');
        } else if (oldOpp.status !== opp.status) {
             // Notify on status change
             StorageService.createNotification(opp.userId, 'Atualização de Status', `Oportunidade ${opp.product} mudou para ${opp.status}.`, 'OPPORTUNITY');
        }
        all[existing] = opp;
    } else {
        all.push(opp);
        if (opp.status === OpportunityStatus.WON) {
             StorageService.addIncomeFromOpportunity(opp);
        }
    }
    set(STORAGE_KEYS.OPPORTUNITIES, all);
  },

  addIncomeFromOpportunity: (opp: Opportunity) => {
      const expense: Expense = {
          id: crypto.randomUUID(),
          userId: opp.userId,
          description: `Venda: ${opp.product} - ${opp.contactName}`,
          amount: opp.value,
          category: 'Vendas',
          date: new Date().toISOString(),
          type: 'INCOME'
      };
      StorageService.saveExpense(expense);
  },

  // Expenses
  getExpenses: (userId: string): Expense[] => {
    const all = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    return all.filter(e => e.userId === userId);
  },
  saveExpense: (expense: Expense) => {
    const all = get<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    const existing = all.findIndex(e => e.id === expense.id);
    if (existing >= 0) all[existing] = expense;
    else all.push(expense);
    set(STORAGE_KEYS.EXPENSES, all);
  },

  // Activities
  getActivities: (userId: string): Activity[] => {
    const all = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    return all.filter(a => a.userId === userId);
  },
  saveActivity: (activity: Activity) => {
    const all = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
    const existing = all.findIndex(a => a.id === activity.id);
    if (existing >= 0) all[existing] = activity;
    else all.push(activity);
    set(STORAGE_KEYS.ACTIVITIES, all);
  },
  deleteActivity: (id: string) => {
      const all = get<Activity[]>(STORAGE_KEYS.ACTIVITIES, []);
      set(STORAGE_KEYS.ACTIVITIES, all.filter(a => a.id !== id));
  },

  // Notifications
  getNotifications: (userId: string): AppNotification[] => {
    const all = get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return all.filter(n => n.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },
  
  createNotification: (userId: string, title: string, message: string, type: AppNotification['type']) => {
      const newNotif: AppNotification = {
          id: crypto.randomUUID(),
          userId,
          title,
          message,
          read: false,
          timestamp: Date.now(),
          type
      };
      const all = get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      all.push(newNotif);
      set(STORAGE_KEYS.NOTIFICATIONS, all);
      return newNotif;
  },

  markNotificationRead: (id: string) => {
      const all = get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const existing = all.findIndex(n => n.id === id);
      if (existing >= 0) {
          all[existing].read = true;
          set(STORAGE_KEYS.NOTIFICATIONS, all);
      }
  },

  markAllNotificationsRead: (userId: string) => {
      const all = get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      all.forEach(n => {
          if (n.userId === userId) n.read = true;
      });
      set(STORAGE_KEYS.NOTIFICATIONS, all);
  },

  // User Settings
  getUserSettings: (userId: string): UserSettings => {
      const all = get<UserSettings[]>(STORAGE_KEYS.USER_SETTINGS, []);
      const found = all.find(s => s.userId === userId);
      return found || { userId, notificationsEnabled: true, activityAlertMinutes: 15, googleApiKey: '' };
  },

  saveUserSettings: (settings: UserSettings) => {
      const all = get<UserSettings[]>(STORAGE_KEYS.USER_SETTINGS, []);
      const index = all.findIndex(s => s.userId === settings.userId);
      if (index >= 0) all[index] = settings;
      else all.push(settings);
      set(STORAGE_KEYS.USER_SETTINGS, all);
  },

  // Bot Config
  getBotConfig: (userId: string): BotConfig => {
    const all = get<BotConfig[]>(STORAGE_KEYS.BOT_CONFIG, []);
    const found = all.find(c => c.userId === userId);
    return found || { 
        userId, 
        whatsappNumber: '', 
        botName: 'Atendente Virtual', 
        businessDescription: '',
        productsAndPrices: '',
        operatingHours: '',
        communicationTone: 'Profissional e Educado',
        systemInstructions: 'Você é um assistente virtual educado e prestativo.',
        isConnected: false,
        lastConnection: undefined,
        connectionStatus: 'disconnected'
    };
  },

  saveBotConfig: (config: BotConfig) => {
    const all = get<BotConfig[]>(STORAGE_KEYS.BOT_CONFIG, []);
    const index = all.findIndex(c => c.userId === config.userId);
    if (index >= 0) all[index] = config;
    else all.push(config);
    set(STORAGE_KEYS.BOT_CONFIG, all);
  },

  // Auth (Session)
  getCurrentUser: (): User | null => {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!id) return null;
    const users = get<User[]>(STORAGE_KEYS.USERS, []);
    return users.find(u => u.id === id) || null;
  },
  setCurrentUser: (id: string | null) => {
    if (id) localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }
};