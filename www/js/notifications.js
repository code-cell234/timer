/**
 * StudyPulse - Unified Notification & Native Alarm Service
 * Bridges native Android LocalNotifications (Capacitor), Service Worker showNotification,
 * and Browser Notification APIs to guarantee notifications pop up on all platforms.
 */

export class NotificationService {
  constructor() {
    this.hasNativeNotifications = false;
    this.isPermissionGranted = false;
    this.channelId = 'studypulse_reminders_channel';
    this.init();
  }

  async init() {
    // 1. Check if running inside Capacitor Android native wrapper
    if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('LocalNotifications')) {
      this.hasNativeNotifications = true;
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        
        // Create high-priority notification channel for Android 8.0+
        await LocalNotifications.createChannel({
          id: this.channelId,
          name: 'StudyPulse Reminders & Timers',
          description: 'High-priority study session reminders, timer completions, and task alerts',
          importance: 5, // NotificationManager.IMPORTANCE_HIGH
          visibility: 1, // NotificationCompat.VISIBILITY_PUBLIC
          vibration: true,
          lights: true,
          lightColor: '#38BDF8'
        });

        // Request native runtime permissions (Android 13+)
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'granted') {
          this.isPermissionGranted = true;
        } else {
          const req = await LocalNotifications.requestPermissions();
          this.isPermissionGranted = req.display === 'granted';
        }
      } catch (e) {
        console.warn('[NotificationService] Native init error:', e);
      }
    } else if ('Notification' in window) {
      // 2. Web browser fallback
      this.isPermissionGranted = Notification.permission === 'granted';
    }
  }

  async requestPermission() {
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const req = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        this.isPermissionGranted = req.display === 'granted';
        return this.isPermissionGranted;
      } catch (e) {
        console.warn('Native permission request failed:', e);
      }
    }

    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        this.isPermissionGranted = perm === 'granted';
        return this.isPermissionGranted;
      } catch (e) {
        console.warn('Browser permission request failed:', e);
      }
    }

    return false;
  }

  /**
   * Generates a numeric integer ID for a string key (required by Android notification ID)
   */
  hashStringToInt(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Schedule a notification for an exact date and time on Android system
   */
  async scheduleReminder(reminder) {
    if (!reminder || reminder.completed || !reminder.dueDate || !reminder.dueTime) return;

    const [year, month, day] = reminder.dueDate.split('-').map(Number);
    const [hours, mins] = reminder.dueTime.split(':').map(Number);
    const scheduleDate = new Date(year, month - 1, day, hours, mins, 0);

    // If the scheduled time is in the past, skip scheduling
    if (scheduleDate.getTime() <= Date.now()) return;

    const notifId = this.hashStringToInt(`rem_${reminder.id}`);

    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        
        // Cancel existing notification with same ID first
        try {
          await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
        } catch (_) {}

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: `StudyPulse: ${reminder.title}`,
              body: `Scheduled for ${reminder.dueTime} (${reminder.subject || 'General'}). Priority: ${reminder.priority.toUpperCase()}`,
              schedule: { at: scheduleDate, allowWhileIdle: true },
              channelId: this.channelId,
              sound: 'default',
              smallIcon: 'ic_launcher_round',
              actionTypeId: '',
              extra: { reminderId: reminder.id }
            }
          ]
        });
        console.log(`[NotificationService] Scheduled native reminder #${notifId} for ${scheduleDate}`);
      } catch (e) {
        console.warn('[NotificationService] Failed to schedule native reminder:', e);
      }
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelReminder(reminderId) {
    const notifId = this.hashStringToInt(`rem_${reminderId}`);
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: notifId }]
        });
      } catch (e) {
        console.warn('[NotificationService] Cancel failed:', e);
      }
    }
  }

  /**
   * Send an immediate pop-up notification (e.g. Timer finished, Instant alert)
   */
  async sendInstantNotification(title, body, options = {}) {
    // 1. Try Native Android Notification
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const notifId = Math.floor(Math.random() * 100000) + 1000;
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: title,
              body: body,
              schedule: { at: new Date(Date.now() + 200) },
              channelId: this.channelId,
              sound: 'default',
              smallIcon: 'ic_launcher_round'
            }
          ]
        });
        return;
      } catch (e) {
        console.warn('[NotificationService] Instant native notification failed:', e);
      }
    }

    // 2. Try Service Worker showNotification (works on modern mobile & desktop browsers)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification && Notification.permission === 'granted') {
          await reg.showNotification(title, {
            body: body,
            icon: options.icon || 'icons/icon-192.png',
            badge: 'icons/icon-72.png',
            vibrate: [200, 100, 200],
            ...options
          });
          return;
        }
      } catch (e) {
        console.warn('[NotificationService] SW showNotification failed:', e);
      }
    }

    // 3. Fallback to standard window.Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: options.icon || 'icons/icon-192.png',
          ...options
        });
      } catch (e) {
        console.warn('[NotificationService] Standard Notification failed:', e);
      }
    }
  }

  /**
   * Reschedules all upcoming uncompleted reminders from storage
   */
  syncAllReminders(reminders = []) {
    reminders.forEach((r) => {
      if (!r.completed) {
        this.scheduleReminder(r);
      } else {
        this.cancelReminder(r.id);
      }
    });
  }
}

export const notificationService = new NotificationService();
