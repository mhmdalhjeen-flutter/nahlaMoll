const ACK_KEY = 'store-closed-warning-ack';

/** Customer dismissed the informational closed-store warning this session. */
export function hasAcknowledgedClosedStoreWarning(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(ACK_KEY) === '1';
}

export function acknowledgeClosedStoreWarning(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(ACK_KEY, '1');
}

export function clearClosedStoreWarningAck(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(ACK_KEY);
}
