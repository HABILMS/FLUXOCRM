
import { supabase } from './supabase';
import { User, Contact, Opportunity, Expense, Activity, PlanType, UserRole, PlanConfig, OpportunityStatus, AppNotification, UserSettings, BotConfig } from '../types';

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

// Helper to map database snake_case to frontend camelCase
const mapProfileToUser = (p: any): User => {
    // Hardcoded Admin Safety Check
    const isSpecialAdmin = p.email === 'habilsolarconsultoria@gmail.com';
    
    // Normalize Plan to Uppercase to prevent crashes if DB has lowercase
    let planRaw = (p.plan || 'BASIC').toUpperCase();
    if (!DEFAULT_PLANS[planRaw as PlanType]) {
        planRaw = 'BASIC';
    }

    return {
        id: p.id,
        name: p.name || 'Usuário',
        email: p.email || '',
        role: isSpecialAdmin ? UserRole.ADMIN : ((p.role as UserRole) || UserRole.USER),
        plan: planRaw as PlanType,
        isActive: p.is_active,
        avatar: p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'User')}&background=random`
    };
};

export const StorageService = {
  init() {
      // Supabase init handled by client
  },

  // --- USERS & AUTH METADATA ---

  async getCurrentUser(authId: string): Promise<User | null> {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authId)
        .single();
      
      if (error || !data) return null;
      return mapProfileToUser(data);
  },

  async getUsers(): Promise<User[]> {
      const { data } = await supabase.from('profiles').select('*');
      return (data || []).map(mapProfileToUser);
  },

  async saveUser(user: User): Promise<void> {
      await supabase.from('profiles').update({
          name: user.name,
          role: user.role,
          plan: user.plan,
          is_active: user.isActive
      }).eq('id', user.id);
  },

  async deleteUser(id: string): Promise<void> {
      await supabase.from('profiles').delete().eq('id', id);
  },

  // --- CONTACTS ---

  async getContacts(userId: string): Promise<Contact[]> {
      const { data } = await supabase.from('contacts').select('*').eq('user_id', userId);
      return (data || []).map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          name: c.name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          address: c.address,
          lastInteraction: c.last_interaction
      }));
  },

  async saveContact(contact: Contact): Promise<void> {
      const payload = {
          id: contact.id, // Supabase will use this if provided, or generate if new
          user_id: contact.userId,
          name: contact.name,
          company: contact.company,
          email: contact.email,
          phone: contact.phone,
          address: contact.address,
          last_interaction: contact.lastInteraction
      };
      await supabase.from('contacts').upsert(payload);
  },

  async deleteContact(id: string): Promise<void> {
      await supabase.from('contacts').delete().eq('id', id);
  },

  // --- OPPORTUNITIES ---

  async getOpportunities(userId: string): Promise<Opportunity[]> {
      const { data } = await supabase
        .from('opportunities')
        .select('*, contacts(name)')
        .eq('user_id', userId);
      
      return (data || []).map((o: any) => ({
          id: o.id,
          userId: o.user_id,
          contactId: o.contact_id,
          contactName: o.contacts?.name || 'Desconhecido',
          product: o.product,
          value: o.value,
          status: o.status as OpportunityStatus,
          createdAt: o.created_at
      }));
  },

  async saveOpportunity(opp: Opportunity): Promise<void> {
      const payload = {
          id: opp.id,
          user_id: opp.userId,
          contact_id: opp.contactId,
          product: opp.product,
          value: opp.value,
          status: opp.status,
          created_at: opp.createdAt
      };
      await supabase.from('opportunities').upsert(payload);
  },

  async deleteOpportunity(id: string): Promise<void> {
      await supabase.from('opportunities').delete().eq('id', id);
  },

  // --- EXPENSES ---

  async getExpenses(userId: string): Promise<Expense[]> {
      const { data } = await supabase.from('expenses').select('*').eq('user_id', userId);
      return (data || []).map((e: any) => ({
          id: e.id,
          userId: e.user_id,
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: e.date,
          type: e.type
      }));
  },

  async saveExpense(expense: Expense): Promise<void> {
      const payload = {
          id: expense.id,
          user_id: expense.userId,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          type: expense.type
      };
      await supabase.from('expenses').upsert(payload);
  },

  async deleteExpense(id: string): Promise<void> {
      await supabase.from('expenses').delete().eq('id', id);
  },

  // --- ACTIVITIES ---

  async getActivities(userId: string): Promise<Activity[]> {
      const { data } = await supabase.from('activities').select('*').eq('user_id', userId);
      return (data || []).map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          opportunityId: a.opportunity_id || undefined,
          title: a.title,
          description: a.description,
          date: a.date,
          completed: a.completed,
          notified: a.notified
      }));
  },

  async saveActivity(activity: Activity): Promise<void> {
      const payload = {
          id: activity.id,
          user_id: activity.userId,
          opportunity_id: activity.opportunityId || null,
          title: activity.title,
          description: activity.description,
          date: activity.date,
          completed: activity.completed,
          notified: activity.notified
      };
      await supabase.from('activities').upsert(payload);
  },

  async deleteActivity(id: string): Promise<void> {
      await supabase.from('activities').delete().eq('id', id);
  },

  // --- PLANS (Static for now) ---

  getPlanConfigs(): Record<PlanType, PlanConfig> {
      // In a real app, these might come from DB too, but static is fine
      return DEFAULT_PLANS;
  },

  // --- NOTIFICATIONS (Local Storage is fine for transient UI notifs, or move to DB) ---
  // Maintaining Local Storage for notifications to avoid complex realtime DB setup for now
  
  getNotifications(userId: string): AppNotification[] {
      const all = JSON.parse(localStorage.getItem('fluxo_notifications') || '[]') as AppNotification[];
      return all.filter(n => n.userId === userId).sort((a,b) => b.timestamp - a.timestamp);
  },

  createNotification(userId: string, title: string, message: string, type: 'ACTIVITY' | 'SYSTEM' | 'OPPORTUNITY') {
      const all = JSON.parse(localStorage.getItem('fluxo_notifications') || '[]') as AppNotification[];
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
      if (all.length > 200) {
        all.sort((a,b) => a.timestamp - b.timestamp);
        while(all.length > 200) all.shift();
      }
      localStorage.setItem('fluxo_notifications', JSON.stringify(all));
      return newNotif;
  },

  markNotificationRead(id: string) {
      const all = JSON.parse(localStorage.getItem('fluxo_notifications') || '[]') as AppNotification[];
      const index = all.findIndex(n => n.id === id);
      if (index >= 0) {
          all[index].read = true;
          localStorage.setItem('fluxo_notifications', JSON.stringify(all));
      }
  },

  markAllNotificationsRead(userId: string) {
      const all = JSON.parse(localStorage.getItem('fluxo_notifications') || '[]') as AppNotification[];
      const updated = all.map(n => n.userId === userId ? {...n, read: true} : n);
      localStorage.setItem('fluxo_notifications', JSON.stringify(updated));
  },

  // --- USER SETTINGS ---

  async getUserSettings(userId: string): Promise<UserSettings> {
      const { data } = await supabase.from('profiles').select('notifications_enabled, activity_alert_minutes, google_api_key').eq('id', userId).single();
      
      return {
          userId,
          notificationsEnabled: data?.notifications_enabled || false,
          activityAlertMinutes: data?.activity_alert_minutes || 15,
          googleApiKey: data?.google_api_key || undefined
      };
  },

  async saveUserSettings(settings: UserSettings): Promise<void> {
      await supabase.from('profiles').update({
          notifications_enabled: settings.notificationsEnabled,
          activity_alert_minutes: settings.activityAlertMinutes,
          google_api_key: settings.googleApiKey
      }).eq('id', settings.userId);
  },

  // --- BOT CONFIGS ---

  async getBotConfig(userId: string): Promise<BotConfig> {
      const { data } = await supabase.from('bot_configs').select('*').eq('user_id', userId).single();
      
      if (!data) {
          return {
              userId,
              whatsappNumber: '',
              botName: '',
              systemInstructions: '',
              isConnected: false
          };
      }

      return {
          userId,
          whatsappNumber: data.whatsapp_number,
          botName: data.bot_name,
          businessDescription: data.business_description,
          productsAndPrices: data.products_prices,
          operatingHours: data.operating_hours,
          communicationTone: data.communication_tone,
          systemInstructions: data.system_instructions,
          isConnected: data.is_connected,
          lastConnection: data.last_connection,
          connectionStatus: data.is_connected ? 'connected' : 'disconnected'
      };
  },

  async saveBotConfig(config: BotConfig): Promise<void> {
      const payload = {
          user_id: config.userId,
          whatsapp_number: config.whatsappNumber,
          bot_name: config.botName,
          business_description: config.businessDescription,
          products_prices: config.productsAndPrices,
          operating_hours: config.operatingHours,
          communication_tone: config.communicationTone,
          system_instructions: config.systemInstructions,
          is_connected: config.isConnected,
          last_connection: config.lastConnection
      };
      await supabase.from('bot_configs').upsert(payload);
  },

  // --- DATABASE MGMT ---

  async getDatabaseStats() {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: contacts } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      const { count: opportunities } = await supabase.from('opportunities').select('*', { count: 'exact', head: true });
      const { count: activities } = await supabase.from('activities').select('*', { count: 'exact', head: true });
      
      let size = 0;
      for(let x in localStorage) {
          if(x.startsWith('fluxo_')) size += ((localStorage[x].length * 2));
      }

      return {
          users: users || 0,
          contacts: contacts || 0,
          opportunities: opportunities || 0,
          activities: activities || 0,
          sizeKB: (size / 1024).toFixed(2)
      };
  },

  async exportDatabase(): Promise<string> {
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: contacts } = await supabase.from('contacts').select('*');
      const { data: opportunities } = await supabase.from('opportunities').select('*');
      const { data: expenses } = await supabase.from('expenses').select('*');
      const { data: activities } = await supabase.from('activities').select('*');
      const { data: botConfigs } = await supabase.from('bot_configs').select('*');

      const dump = {
          profiles, contacts, opportunities, expenses, activities, botConfigs,
          timestamp: new Date().toISOString()
      };
      return JSON.stringify(dump, null, 2);
  },

  async importDatabase(json: string): Promise<boolean> {
      try {
          const data = JSON.parse(json);
          if(data.profiles) await supabase.from('profiles').upsert(data.profiles);
          if(data.contacts) await supabase.from('contacts').upsert(data.contacts);
          if(data.opportunities) await supabase.from('opportunities').upsert(data.opportunities);
          if(data.expenses) await supabase.from('expenses').upsert(data.expenses);
          if(data.activities) await supabase.from('activities').upsert(data.activities);
          if(data.botConfigs) await supabase.from('bot_configs').upsert(data.botConfigs);
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  },

  async resetDatabase(): Promise<void> {
      await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('opportunities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
};
