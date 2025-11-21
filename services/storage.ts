
import { User, Contact, Opportunity, Expense, Activity, PlanType, UserRole, PlanConfig, OpportunityStatus, AppNotification, UserSettings, BotConfig } from '../types';

const KEYS = {
  USERS: 'fluxo_users',
  CONTACTS: 'fluxo_contacts',
  OPPORTUNITIES: 'fluxo_opportunities',
  EXPENSES: 'fluxo_expenses',
  ACTIVITIES: 'fluxo_activities',
  NOTIFICATIONS: 'fluxo_notifications',
  PLANS: 'fluxo_plan_configs',
  SETTINGS: 'fluxo_user_settings',
  BOT_CONFIGS: 'fluxo_bot_configs',
  CURRENT_USER: 'fluxo_current_user'
};

const DEFAULT_PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.BASIC]: {
    type: PlanType.BASIC,
    name: 'Básico',
    price: 29.90,
    maxContacts: 50,
    maxOpportunities: 10,
    features: { expenses: false, aiAssistant: false, voiceCommands: false }
  },
  [PlanType.ADVANCED]: {
    type: PlanType.ADVANCED,
    name: 'Profissional',
    price: 79.90,
    maxContacts: 500,
    maxOpportunities: 100,
    features: { expenses: true, aiAssistant: true, voiceCommands: false }
  },
  [PlanType.EXPERT]: {
    type: PlanType.EXPERT,
    name: 'Expert AI',
    price: 149.90,
    maxContacts: -1,
    maxOpportunities: -1,
    features: { expenses: true, aiAssistant: true, voiceCommands: true }
  }
};

export const StorageService = {
  init() {
    if (!localStorage.getItem(KEYS.PLANS)) {
      this.savePlanConfigs(DEFAULT_PLANS);
    }

    if (!localStorage.getItem(KEYS.USERS)) {
      const defaultUsers: User[] = [
        {
          id: 'admin-1',
          name: 'Administrador',
          email: 'admin@fluxo.com',
          password: 'admin',
          role: UserRole.ADMIN,
          plan: PlanType.EXPERT,
          isActive: true,
          avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
        },
        {
          id: 'user-1',
          name: 'Maria Silva',
          email: 'maria@client.com',
          password: '123',
          role: UserRole.USER,
          plan: PlanType.EXPERT,
          isActive: true,
          avatar: 'https://ui-avatars.com/api/?name=Maria+Silva&background=random'
        },
        {
          id: 'user-2',
          name: 'João Souza',
          email: 'joao@client.com',
          password: '123',
          role: UserRole.USER,
          plan: PlanType.BASIC,
          isActive: true,
          avatar: 'https://ui-avatars.com/api/?name=Joao+Souza&background=random'
        }
      ];
      localStorage.setItem(KEYS.USERS, JSON.stringify(defaultUsers));
      
      // Create default settings for these users
      defaultUsers.forEach(u => {
          this.saveUserSettings({
              userId: u.id,
              notificationsEnabled: true,
              activityAlertMinutes: 15
          });
      });
    }
  },

  // Database Management
  exportDatabase(): string {
    const data: any = {};
    Object.values(KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
            try {
                data[key] = JSON.parse(item);
            } catch (e) {
                data[key] = item;
            }
        }
    });
    return JSON.stringify(data, null, 2);
  },

  importDatabase(jsonString: string): boolean {
      try {
          const data = JSON.parse(jsonString);
          // Validate basic structure
          if (!data[KEYS.USERS] || !Array.isArray(data[KEYS.USERS])) {
              throw new Error("Invalid database format");
          }

          // Clear and set
          localStorage.clear();
          Object.keys(data).forEach(key => {
              const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
              localStorage.setItem(key, value);
          });
          return true;
      } catch (e) {
          console.error("Import failed", e);
          return false;
      }
  },

  resetDatabase() {
      localStorage.clear();
      this.init();
      window.location.reload();
  },

  getDatabaseStats() {
      return {
          users: this.getUsers().length,
          contacts: JSON.parse(localStorage.getItem(KEYS.CONTACTS) || '[]').length,
          opportunities: JSON.parse(localStorage.getItem(KEYS.OPPORTUNITIES) || '[]').length,
          expenses: JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]').length,
          activities: JSON.parse(localStorage.getItem(KEYS.ACTIVITIES) || '[]').length,
          sizeKB: (JSON.stringify(localStorage).length / 1024).toFixed(2)
      };
  },

  // User Auth & Management
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },

  saveUser(user: User) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  deleteUser(id: string) {
      // Cascading Delete: Remove all data belonging to this user
      let users = this.getUsers().filter(u => u.id !== id);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));

      const contacts = this.getAllContacts().filter(c => c.userId !== id);
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));

      const opps = this.getAllOpportunities().filter(o => o.userId !== id);
      localStorage.setItem(KEYS.OPPORTUNITIES, JSON.stringify(opps));

      const expenses = this.getAllExpenses().filter(e => e.userId !== id);
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
      
      const activities = this.getAllActivities().filter(a => a.userId !== id);
      localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));

      // Clean settings and bot configs
      let settings = this.getAllUserSettings().filter(s => s.userId !== id);
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      
      let bots = this.getAllBotConfigs().filter(b => b.userId !== id);
      localStorage.setItem(KEYS.BOT_CONFIGS, JSON.stringify(bots));
      
      // Clean notifications
      const notifs = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]') as AppNotification[];
      const updatedNotifs = notifs.filter(n => n.userId !== id);
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updatedNotifs));
  },

  getCurrentUser(): User | null {
    const id = localStorage.getItem(KEYS.CURRENT_USER);
    if (!id) return null;
    return this.getUsers().find(u => u.id === id) || null;
  },

  setCurrentUser(id: string | null) {
    if (id) {
      localStorage.setItem(KEYS.CURRENT_USER, id);
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  // Contacts
  getAllContacts(): Contact[] {
      return JSON.parse(localStorage.getItem(KEYS.CONTACTS) || '[]');
  },
  getContacts(userId: string): Contact[] {
    return this.getAllContacts().filter(c => c.userId === userId);
  },
  saveContact(contact: Contact) {
    const contacts = this.getAllContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.push(contact);
    }
    localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
  },
  deleteContact(id: string) {
      const contacts = this.getAllContacts().filter(c => c.id !== id);
      localStorage.setItem(KEYS.CONTACTS, JSON.stringify(contacts));
      
      // Cascade: Delete opportunities for this contact
      const opps = this.getAllOpportunities().filter(o => o.contactId !== id);
      localStorage.setItem(KEYS.OPPORTUNITIES, JSON.stringify(opps));
  },

  // Opportunities
  getAllOpportunities(): Opportunity[] {
      return JSON.parse(localStorage.getItem(KEYS.OPPORTUNITIES) || '[]');
  },
  getOpportunities(userId: string): Opportunity[] {
    return this.getAllOpportunities().filter(o => o.userId === userId);
  },
  saveOpportunity(opp: Opportunity) {
    const opps = this.getAllOpportunities();
    const index = opps.findIndex(o => o.id === opp.id);
    if (index >= 0) {
      opps[index] = opp;
    } else {
      opps.push(opp);
    }
    localStorage.setItem(KEYS.OPPORTUNITIES, JSON.stringify(opps));
  },
  deleteOpportunity(id: string) {
      const opps = this.getAllOpportunities().filter(o => o.id !== id);
      localStorage.setItem(KEYS.OPPORTUNITIES, JSON.stringify(opps));

      // Cascade: Unlink activities from this opportunity
      const activities = this.getAllActivities();
      const updatedActivities = activities.map(a => {
          if (a.opportunityId === id) {
              // Remove the opportunityId reference
              const { opportunityId, ...rest } = a;
              return rest as Activity;
          }
          return a;
      });
      localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(updatedActivities));
  },

  // Expenses
  getAllExpenses(): Expense[] {
      return JSON.parse(localStorage.getItem(KEYS.EXPENSES) || '[]');
  },
  getExpenses(userId: string): Expense[] {
    return this.getAllExpenses().filter(e => e.userId === userId);
  },
  saveExpense(expense: Expense) {
    const expenses = this.getAllExpenses();
    const index = expenses.findIndex(e => e.id === expense.id);
    if (index >= 0) {
      expenses[index] = expense;
    } else {
      expenses.push(expense);
    }
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },
  deleteExpense(id: string) {
      const expenses = this.getAllExpenses().filter(e => e.id !== id);
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  },

  // Activities
  getAllActivities(): Activity[] {
      return JSON.parse(localStorage.getItem(KEYS.ACTIVITIES) || '[]');
  },
  getActivities(userId: string): Activity[] {
    return this.getAllActivities().filter(a => a.userId === userId);
  },
  saveActivity(activity: Activity) {
    const activities = this.getAllActivities();
    const index = activities.findIndex(a => a.id === activity.id);
    if (index >= 0) {
      activities[index] = activity;
    } else {
      activities.push(activity);
    }
    localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
  },
  deleteActivity(id: string) {
      const activities = this.getAllActivities().filter(a => a.id !== id);
      localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
  },

  // Plans
  getPlanConfigs(): Record<PlanType, PlanConfig> {
    return JSON.parse(localStorage.getItem(KEYS.PLANS) || JSON.stringify(DEFAULT_PLANS));
  },

  savePlanConfigs(configs: Record<PlanType, PlanConfig>) {
    localStorage.setItem(KEYS.PLANS, JSON.stringify(configs));
  },

  // Notifications
  getNotifications(userId: string): AppNotification[] {
      const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]') as AppNotification[];
      return all.filter(n => n.userId === userId).sort((a,b) => b.timestamp - a.timestamp);
  },

  createNotification(userId: string, title: string, message: string, type: 'ACTIVITY' | 'SYSTEM' | 'OPPORTUNITY') {
      const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]') as AppNotification[];
      const newNotif: AppNotification = {
          id: crypto.randomUUID(),
          userId,
          title,
          message,
          read: false,
          timestamp: Date.now(),
          type
      };
      all.push(newNotif);
      
      // Limit logic: keep last 200 globally or filter per user
      if (all.length > 200) {
        // Remove oldest
        all.sort((a,b) => a.timestamp - b.timestamp);
        while(all.length > 200) all.shift();
      }
      
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
      return newNotif;
  },

  markNotificationRead(id: string) {
      const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]') as AppNotification[];
      const index = all.findIndex(n => n.id === id);
      if (index >= 0) {
          all[index].read = true;
          localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
      }
  },

  markAllNotificationsRead(userId: string) {
      const all = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]') as AppNotification[];
      const updated = all.map(n => n.userId === userId ? {...n, read: true} : n);
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  },

  // Settings
  getAllUserSettings(): UserSettings[] {
      return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '[]');
  },
  getUserSettings(userId: string): UserSettings {
      const all = this.getAllUserSettings();
      const found = all.find(s => s.userId === userId);
      if (found) return found;
      
      // Default
      return {
          userId,
          notificationsEnabled: false,
          activityAlertMinutes: 15
      };
  },
  saveUserSettings(settings: UserSettings) {
      let all = this.getAllUserSettings();
      const index = all.findIndex(s => s.userId === settings.userId);
      if (index >= 0) {
          all[index] = settings;
      } else {
          all.push(settings);
      }
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(all));
  },

  // Bot Config
  getAllBotConfigs(): BotConfig[] {
      return JSON.parse(localStorage.getItem(KEYS.BOT_CONFIGS) || '[]');
  },
  getBotConfig(userId: string): BotConfig {
      const all = this.getAllBotConfigs();
      const found = all.find(b => b.userId === userId);
      if (found) return found;

      return {
          userId,
          whatsappNumber: '',
          botName: '',
          systemInstructions: '',
          isConnected: false
      };
  },
  saveBotConfig(config: BotConfig) {
      let all = this.getAllBotConfigs();
      const index = all.findIndex(b => b.userId === config.userId);
      if (index >= 0) {
          all[index] = config;
      } else {
          all.push(config);
      }
      localStorage.setItem(KEYS.BOT_CONFIGS, JSON.stringify(all));
  }
};
