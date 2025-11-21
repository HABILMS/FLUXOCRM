
import { StorageService } from "./storage";
import { User } from "../types";

class NotificationService {
  private intervalId: number | null = null;

  public async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  public startService(user: User) {
    if (this.intervalId) clearInterval(this.intervalId);
    
    // Check immediately on start
    this.checkActivities(user);

    // Poll every minute
    this.intervalId = window.setInterval(() => {
      this.checkActivities(user);
    }, 60000);
  }

  public stopService() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkActivities(user: User) {
    const settings = await StorageService.getUserSettings(user.id);
    if (!settings.notificationsEnabled) return;

    const activities = await StorageService.getActivities(user.id);
    const now = new Date();
    const alertWindow = settings.activityAlertMinutes; // e.g., 15 minutes

    activities.forEach(activity => {
      if (activity.completed || activity.notified) return;

      const activityTime = new Date(activity.date);
      const diffMs = activityTime.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      // If within the window (e.g. between 0 and 15 minutes from now)
      if (diffMinutes >= 0 && diffMinutes <= alertWindow) {
        this.sendBrowserNotification(`Atividade Próxima: ${activity.title}`, {
          body: `Sua atividade está agendada para ${activityTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`,
          icon: '/favicon.ico'
        });

        // Persist in App Notifications
        StorageService.createNotification(
            user.id,
            `Lembrete: ${activity.title}`,
            `Atividade agendada para ${activityTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
            'ACTIVITY'
        );

        // Mark as notified so we don't spam
        activity.notified = true;
        StorageService.saveActivity(activity);
      }
    });
  }

  public sendBrowserNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === "granted") {
      new Notification(title, options);
    }
  }
}

export const notificationService = new NotificationService();
