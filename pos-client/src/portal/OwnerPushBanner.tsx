import { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCircle2 } from 'lucide-react';
import {
  enableOwnerSaleNotifications,
  getNotificationPermission,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
  maintainOwnerPushSubscription,
} from '../lib/pushNotifications';
import './OwnerPushBanner.css';

type Status = 'loading' | 'ready' | 'enabled' | 'unsupported';

function reasonMessage(reason: string): string {
  switch (reason) {
    case 'ios_not_standalone':
      return 'Open the app from your Home Screen icon (not Safari), then tap Enable notifications again.';
    case 'denied':
      return 'Notifications are blocked. Open device Settings → this app → allow Notifications, then try again.';
    case 'missing_public_key':
      return 'Push is not configured on the server yet. Contact HQ.';
    case 'unsupported':
      return 'This device/browser does not support push notifications.';
    case 'dismissed':
      return 'Permission was not granted. Tap Enable notifications and choose Allow.';
    default:
      return `Could not enable notifications (${reason}).`;
  }
}

/**
 * Always-visible Enable notifications control for franchise owners on the installed PWA.
 */
export default function OwnerPushBanner() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [iosTip, setIosTip] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      setMessage(reasonMessage('unsupported'));
      return;
    }

    const standalone = isStandalonePwa();
    setIosTip(isIosDevice() && !standalone);

    const permission = await getNotificationPermission();
    if (permission === 'granted') {
      void maintainOwnerPushSubscription();
      setStatus('enabled');
      setMessage('');
      return;
    }

    setStatus('ready');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onEnable = async () => {
    setBusy(true);
    setMessage('');
    const result = await enableOwnerSaleNotifications();
    setBusy(false);

    if (result.ok) {
      setStatus('enabled');
      setMessage('');
      return;
    }

    setMessage(reasonMessage(result.reason));
    if (result.reason === 'ios_not_standalone') {
      setIosTip(true);
    }
    await refresh();
  };

  if (status === 'loading') {
    return (
      <div className="owner-push-card owner-push-card--loading" aria-busy="true">
        Checking notification status…
      </div>
    );
  }

  if (status === 'enabled') {
    return (
      <div className="owner-push-card owner-push-card--ok" role="status">
        <div className="owner-push-card-main">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>Sale notifications are on</strong>
            <p>You&apos;ll get Total Sales, cups sold, and punch time when an order is punched.</p>
          </div>
        </div>
        <button
          type="button"
          className="owner-push-card-btn owner-push-card-btn--ghost"
          onClick={() => void onEnable()}
          disabled={busy}
        >
          {busy ? 'Refreshing…' : 'Re-enable on this device'}
        </button>
      </div>
    );
  }

  return (
    <div className="owner-push-card" role="region" aria-label="Enable sale notifications">
      <div className="owner-push-card-main">
        {status === 'unsupported' ? (
          <Bell size={20} aria-hidden="true" />
        ) : (
          <BellRing size={20} aria-hidden="true" />
        )}
        <div>
          <strong>Enable notifications</strong>
          <p>
            Turn on PWA push alerts for every punched order: Total Sales, cups sold, and time.
          </p>
          {iosTip && (
            <p className="owner-push-card-tip">
              iPhone: open this app from the Home Screen icon, then tap the button below.
            </p>
          )}
          {message && <p className="owner-push-card-error">{message}</p>}
        </div>
      </div>
      <button
        type="button"
        className="owner-push-card-btn"
        id="enable-notifications-btn"
        onClick={() => void onEnable()}
        disabled={busy || status === 'unsupported'}
      >
        {busy ? 'Enabling…' : 'Enable notifications'}
      </button>
    </div>
  );
}
