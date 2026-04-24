const SESSION_KEY = 'grateful-stash.active-stash-id';

export function saveActiveStashId(id: string): void {
  sessionStorage.setItem(SESSION_KEY, id);
}

export function loadActiveStashId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function clearActiveStashId(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
