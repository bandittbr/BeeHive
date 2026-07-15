export type PlanType = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxWorkspaces: number;
  maxProjects: number;
  maxAgents: number;
  maxTokensPerMonth: number;
  maxStorageMb: number;
  maxTeamMembers: number;
  customProviders: boolean;
  premiumModels: boolean;
  apiAccess: boolean;
  priority: boolean;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: number;
  dueAt?: number;
  items: InvoiceItem[];
}

export type InvoiceStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'
  | 'REFUNDED';

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
}

export interface IBillingService {
  getPlan(planType: PlanType): Plan;
  getSubscription(workspaceId: string): Promise<Subscription>;
  changePlan(workspaceId: string, plan: PlanType): Promise<Subscription>;
  cancelSubscription(workspaceId: string): Promise<void>;
  getInvoices(workspaceId: string): Promise<Invoice[]>;
  getUsage(workspaceId: string): Promise<UsageReport>;
}

export interface UsageReport {
  tokensUsed: number;
  tokensLimit: number;
  storageUsed: number;
  storageLimit: number;
  activeAgents: number;
  agentLimit: number;
  periodStart: number;
  periodEnd: number;
}
