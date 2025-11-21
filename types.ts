
export enum PlanType {
  BASIC = 'BASIC',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum OpportunityStatus {
  OPEN = 'Aberta',
  NEGOTIATION = 'Em Negociação',
  WON = 'Fechada (Ganho)',
  LOST = 'Perdida'
}

export interface PlanConfig {
  type: PlanType;
  name: string;
  price: number;
  maxContacts: number; // -1 for unlimited
  maxOpportunities: number; // -1 for unlimited
  features: {
    expenses: boolean;
    aiAssistant: boolean;
    voiceCommands: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store plain text
  role: UserRole;
  plan: PlanType;
  isActive: boolean;
  avatar?: string;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  lastInteraction: string; // ISO Date
}

export interface Opportunity {
  id: string;
  userId: string;
  contactId: string;
  contactName: string; // Denormalized for easier display
  product: string;
  value: number;
  status: OpportunityStatus;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Activity {
  id: string;
  userId: string;
  opportunityId?: string;
  title: string;
  description: string;
  date: string; // ISO Date Time
  completed: boolean;
  notified?: boolean; // Track if alert was sent
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Notification Types
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  type: 'ACTIVITY' | 'SYSTEM' | 'OPPORTUNITY';
}

export interface UserSettings {
  userId: string;
  notificationsEnabled: boolean;
  activityAlertMinutes: number;
  googleApiKey?: string;
}

export interface BotConfig {
  userId: string;
  whatsappNumber: string;
  botName: string;
  // Structured business data for better prompting
  businessDescription?: string;
  productsAndPrices?: string;
  operatingHours?: string;
  communicationTone?: string;
  systemInstructions: string;
  isConnected?: boolean;
  lastConnection?: string;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected';
}