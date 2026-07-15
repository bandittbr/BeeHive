export type NotificationChannel = 'in-app' | 'email' | 'webhook' | 'slack' | 'discord';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  userId?: string;
  workspaceId?: string;
  channel: NotificationChannel[];
  priority: NotificationPriority;
  link?: string;
  metadata?: Record<string, unknown>;
  read?: boolean;
  createdAt: number;
}

export interface INotificationService {
  send(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string>;
  markRead(notificationId: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  list(userId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<Notification[]>;
  getUnreadCount(userId: string): Promise<number>;
}
