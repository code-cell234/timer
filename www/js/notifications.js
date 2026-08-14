/**
 * StudyPulse - Unified Notification & Native Alarm Service
 * Bridges native Android LocalNotifications (Capacitor), Service Worker showNotification,
 * and Browser Notification APIs to guarantee notifications pop up on all platforms —
 * including when the phone is locked (screen off / Doze mode) or another app is open.
 *
 * Channels:
 *  - studypulse_timers_channel     : Focus Session & Break timer completions
 *  - studypulse_reminders_channel  : Reminders, Due Dates, Study Alarms
 */

const TIMER_NOTIF_ID    = 99998; // Fixed ID so we can cancel/update the timer alarm
const TEST_NOTIF_ID     = 99999; // Fixed ID for the 5-second test

export class NotificationService {
  constructor() {
    this.hasNativeNotifications = false;
    this.isPermissionGranted = false;
    this.timersChannelId    = 'studypulse_timers_channel';
    this.remindersChannelId = 'studypulse_reminders_channel';
    this._initPromise = null;
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────

  async init() {
    // De-duplicate concurrent init calls
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    if (
      window.Capacitor &&
      window.Capacitor.isPluginAvailable &&
      window.Capacitor.isPluginAvailable('LocalNotifications')
    ) {
      this.hasNativeNotifications = true;
      const { LocalNotifications } = window.Capacitor.Plugins;

      try {
        // Create HIGH-PRIORITY channel for Focus/Break timer alarms
        await LocalNotifications.createChannel({
          id: this.timersChannelId,
          name: 'StudyPulse Timer Alarms',
          description: 'Fires when a Focus Session or Break completes — even on the lock screen.',
          importance: 5,       // IMPORTANCE_HIGH → Heads-up floating banner
          visibility: 1,       // VISIBILITY_PUBLIC → Full content visible on lock screen
          vibration: true,
          lights: true,
          lightColor: '#38BDF8',
          sound: 'default'
        });

        // Create HIGH-PRIORITY channel for Reminders & Due-date alarms
        await LocalNotifications.createChannel({
          id: this.remindersChannelId,
          name: 'StudyPulse Reminders & Alerts',
          description: 'Scheduled study reminders, due-date alarms, and task alerts.',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#F59E0B',
          sound: 'default'
        });

        // Register tap handler — routes to the right app view
        LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const data = event.notification.extra || {};
          if (data.type === 'timer') {
            window.dispatchEvent(new CustomEvent('sp:navigate', { detail: { view: 'focus-view' } }));
          } else if (data.type === 'reminder' && data.reminderId) {
            window.dispatchEvent(new CustomEvent('sp:openReminder', { detail: { id: data.reminderId } }));
          }
        });

        // Check / request native permission (Android 13+ runtime)
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
      // Web / PWA browser fallback
      this.isPermissionGranted = Notification.permission === 'granted';
    }
  }

  // ─── PERMISSIONS ──────────────────────────────────────────────────────────

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

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Stable integer ID from a string key (required by Android notification IDs)
   */
  hashStringToInt(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ─── TIMER ALARM ─────────────────────────────────────────────────────────

  /**
   * Schedule a native alarm that fires at an exact timestamp even when the phone
   * is locked or another app is in the foreground.
   *
   * @param {number} endTimestamp - Unix ms when the timer ends (Date.now() + remainingSecs * 1000)
   * @param {boolean} isFocus     - true = Focus session ending; false = Break ending
   * @param {number} minutes      - session length in minutes (for the notification body)
   * @param {string} subject      - subject label (e.g. "Mathematics")
   */
  async scheduleTimerNotification(endTimestamp, isFocus, minutes, subject = 'General') {
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        // Cancel any previously scheduled timer alarm first
        await this.cancelTimerNotification();

        const { LocalNotifications } = window.Capacitor.Plugins;
        const fireAt = new Date(endTimestamp);

        const title = isFocus ? '🏆 Focus Session Complete!' : '⚡ Break Over — Back to Focus!';
        const body  = isFocus
          ? `Great work! You logged ${minutes} min in ${subject}. Time for a well-deserved break!`
          : `Your break is up. Time to start your next focus interval and crush your goals!`;

        await LocalNotifications.schedule({
          notifications: [{
            id: TIMER_NOTIF_ID,
            title,
            body,
            schedule: { at: fireAt, allowWhileIdle: true },
            channelId: this.timersChannelId,
            sound: 'default',
            smallIcon: 'ic_launcher_round',
            vibrate: true,
            ongoing: false,
            autoCancel: true,
            extra: { type: 'timer', isFocus, minutes, subject }
          }]
        });
        console.log(`[NotificationService] Timer alarm set for ${fireAt.toLocaleTimeString()}`);
      } catch (e) {
        console.warn('[NotificationService] Failed to schedule timer alarm:', e);
      }
    }
  }

  /**
   * Cancel any pending timer alarm (e.g. when the timer is paused, reset, or skipped).
   */
  async cancelTimerNotification() {
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: TIMER_NOTIF_ID }]
        });
      } catch (_) {}
    }
  }

  // ─── REMINDER SCHEDULING ─────────────────────────────────────────────────

  /**
   * Schedule a native reminder at an exact date/time.
   * Uses allowWhileIdle: true so it fires in Doze mode and on the lock screen.
   */
  async scheduleReminder(reminder) {
    if (!reminder || reminder.completed || !reminder.dueDate || !reminder.dueTime) return;

    const [year, month, day] = reminder.dueDate.split('-').map(Number);
    const [hours, mins]      = reminder.dueTime.split(':').map(Number);
    const scheduleDate       = new Date(year, month - 1, day, hours, mins, 0);

    if (scheduleDate.getTime() <= Date.now()) return;

    const notifId = this.hashStringToInt(`rem_${reminder.id}`);

    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;

        try { await LocalNotifications.cancel({ notifications: [{ id: notifId }] }); } catch (_) {}

        await LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title: `🔔 StudyPulse: ${reminder.title}`,
            body: `Due at ${reminder.dueTime} (${reminder.subject || 'General'}) · Priority: ${reminder.priority?.toUpperCase() || 'NORMAL'}`,
            schedule: { at: scheduleDate, allowWhileIdle: true },
            channelId: this.remindersChannelId,
            sound: 'default',
            smallIcon: 'ic_launcher_round',
            vibrate: true,
            autoCancel: true,
            extra: { type: 'reminder', reminderId: reminder.id }
          }]
        });
        console.log(`[NotificationService] Reminder #${notifId} scheduled for ${scheduleDate}`);
      } catch (e) {
        console.warn('[NotificationService] Failed to schedule reminder:', e);
      }
    }
  }

  /**
   * Cancel a previously scheduled reminder notification.
   */
  async cancelReminder(reminderId) {
    const notifId = this.hashStringToInt(`rem_${reminderId}`);
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        await window.Capacitor.Plugins.LocalNotifications.cancel({
          notifications: [{ id: notifId }]
        });
      } catch (e) {
        console.warn('[NotificationService] Cancel reminder failed:', e);
      }
    }
  }

  // ─── INSTANT NOTIFICATION ────────────────────────────────────────────────

  /**
   * Send an immediate pop-up notification.
   * Tries: Native Android → Service Worker → window.Notification
   */
  async sendInstantNotification(title, body, options = {}) {
    // 1. Native Android (fires even in background)
    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const notifId = Math.floor(Math.random() * 90000) + 10000;
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [{
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 300) },
            channelId: options.isTimer ? this.timersChannelId : this.remindersChannelId,
            sound: 'default',
            smallIcon: 'ic_launcher_round',
            vibrate: true,
            autoCancel: true
          }]
        });
        return;
      } catch (e) {
        console.warn('[NotificationService] Instant native notification failed:', e);
      }
    }

    // 2. Service Worker showNotification (works when tab/PWA is backgrounded)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification && Notification.permission === 'granted') {
          await reg.showNotification(title, {
            body,
            icon: options.icon || 'icons/icon-192.png',
            badge: 'icons/icon-72.png',
            vibrate: [200, 100, 200, 100, 400],
            requireInteraction: false,
            ...options
          });
          return;
        }
      } catch (e) {
        console.warn('[NotificationService] SW showNotification failed:', e);
      }
    }

    // 3. Standard window.Notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: options.icon || 'icons/icon-192.png',
          ...options
        });
      } catch (e) {
        console.warn('[NotificationService] Standard Notification failed:', e);
      }
    }
  }

  // ─── TEST NOTIFICATION ───────────────────────────────────────────────────

  /**
   * Schedule a test notification N seconds in the future so the user can lock
   * their phone and verify that lock-screen pop-ups work correctly.
   *
   * @param {number} delaySecs - seconds until the notification fires (default 5)
   */
  async scheduleTestNotification(delaySecs = 5) {
    const fireAt = new Date(Date.now() + delaySecs * 1000);

    if (this.hasNativeNotifications && window.Capacitor?.Plugins?.LocalNotifications) {
      try {
        try { await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIF_ID }] }); } catch (_) {}

        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: [{
            id: TEST_NOTIF_ID,
            title: '🔔 StudyPulse — Lock Screen Test!',
            body: `This notification fired ${delaySecs}s after you locked your screen. Everything is working correctly! 🎉`,
            schedule: { at: fireAt, allowWhileIdle: true },
            channelId: this.remindersChannelId,
            sound: 'default',
            smallIcon: 'ic_launcher_round',
            vibrate: true,
            autoCancel: true,
            extra: { type: 'test' }
          }]
        });
        console.log(`[NotificationService] Test notification scheduled for ${fireAt.toLocaleTimeString()}`);
        return true;
      } catch (e) {
        console.warn('[NotificationService] Test notification failed:', e);
        return false;
      }
    } else {
      // Browser fallback — fires immediately (browser can't truly lock-screen test)
      setTimeout(() => this.sendInstantNotification(
        '🔔 StudyPulse — Notification Test',
        `Fired ${delaySecs}s after the test was triggered. (For full lock-screen support, use the Android app.)`,
        {}
      ), delaySecs * 1000);
      return true;
    }
  }

  // ─── SYNC ALL ─────────────────────────────────────────────────────────────

  /**
   * Re-schedule all uncompleted reminders from storage.
   * Call on app startup, permission grant, and state change.
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
