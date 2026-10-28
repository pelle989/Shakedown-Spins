import type { Album } from './types';
import {
  albumKey, emptyListeningState, mergeListeningState, parseListeningState, pickedKeys,
  type ListeningSnapshot, type ListeningState
} from './listening-state';

export class ListeningSession {
  state = emptyListeningState();
  readonly storageKey: string;
  private timer?: ReturnType<typeof setTimeout>;
  private running: Promise<void> | null = null;
  private revision = 0;
  private syncedRevision = 0;
  private disposed = false;
  private clock = Date.now();
  private storageFailed = false;

  constructor(readonly userId: string | null, private changed: (state: ListeningState) => void,
    private failed: (message: string | null) => void) {
    this.storageKey = `shakedown-spins.listening.v1:${userId ?? 'guest'}`;
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) this.state = parseListeningState(JSON.parse(saved));
    } catch {
      this.storageFailed = true;
      queueMicrotask(() => { if (!this.disposed) failed('Browser storage is unavailable. Listening progress may not survive a reload.'); });
    }
  }

  private timestamp() {
    this.clock = Math.max(Date.now(), this.clock + 1, this.state.activeAt + 1, this.state.preferenceAt + 1);
    return this.clock;
  }

  private store() {
    try {
      const serialized = JSON.stringify(this.state);
      if (localStorage.getItem(this.storageKey) !== serialized) localStorage.setItem(this.storageKey, serialized);
      this.storageFailed = false;
    } catch {
      this.storageFailed = true;
      this.failed('Could not save progress in this browser. Free storage and retry.');
    }
  }

  private commit() {
    this.revision++;
    this.store();
    this.changed(this.state);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.sync(); }, 200);
  }

  setActive(active: ListeningSnapshot | null) {
    if (JSON.stringify(active) === JSON.stringify(this.state.active)) return;
    this.state = { ...this.state, active, activeAt: this.timestamp() };
    this.commit();
  }

  setRemember(remember: boolean) {
    this.state = { ...this.state, remember, preferenceAt: this.timestamp() };
    this.commit();
  }

  resetHistory(key: string) {
    this.state = { ...this.state, histories: { ...this.state.histories,
      [key]: { resetAt: this.timestamp(), entries: {} } } };
    this.commit();
  }

  reconcileHistory(key: string, albums: Album[]) {
    const history = this.state.histories[key];
    if (!history) return;
    const available = new Set(albums.map(albumKey));
    const removed = Object.entries(history.entries).filter(([id, event]) => event.picked && !available.has(id));
    if (!removed.length) return;
    const entries = { ...history.entries };
    const at = this.timestamp();
    for (const [id] of removed) entries[id] = { at, picked: false };
    this.state = { ...this.state, histories: { ...this.state.histories, [key]: { ...history, entries } } };
    this.commit();
  }

  recordPick(key: string, albums: Album[], eligible: Album[], pick: Album) {
    if (!this.state.remember) return;
    const history = this.state.histories[key] ?? { resetAt: 0, entries: {} };
    const entries = { ...history.entries };
    const at = this.timestamp();
    const previous = new Set(pickedKeys(history));
    const eligibleKeys = eligible.map(albumKey);
    if (eligibleKeys.every((id) => previous.has(id))) {
      for (const id of eligibleKeys) entries[id] = { at, picked: false };
    }
    // Tombstones keep stale devices from resurrecting removed album picks.
    const available = new Set(albums.map(albumKey));
    for (const [id, event] of Object.entries(entries)) {
      if (!available.has(id) && event.picked) entries[id] = { at, picked: false };
    }
    entries[albumKey(pick)] = { at, picked: true };
    this.state = { ...this.state, histories: { ...this.state.histories, [key]: { ...history, entries } } };
    this.commit();
  }

  private accept(remote: ListeningState) {
    if (this.disposed) return;
    this.state = mergeListeningState(this.state, remote);
    this.clock = Math.max(this.clock, this.state.activeAt, this.state.preferenceAt);
    for (const h of Object.values(this.state.histories)) {
      this.clock = Math.max(this.clock, h.resetAt);
      for (const event of Object.values(h.entries)) this.clock = Math.max(this.clock, event.at);
    }
    this.store();
    this.changed(this.state);
  }

  async refresh() {
    if (!this.userId || this.disposed) return;
    try {
      const response = await fetch('/api/listening-state', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      this.accept(parseListeningState(payload.state));
      // Local recovery may contain unsent events from a prior visit.
      await this.sync(true);
    } catch {
      if (!this.disposed) this.failed('Could not sync listening progress. Random is ready; retry saving when connected.');
    }
  }

  async sync(force = false): Promise<void> {
    if (this.disposed) return;
    if (this.running) {
      await this.running;
      if (this.revision !== this.syncedRevision) return this.sync();
      return;
    }
    this.store();
    if (!this.userId) {
      if (!this.storageFailed) this.failed(null);
      return;
    }
    if (!force && this.revision === this.syncedRevision) return;
    const revision = this.revision;
    const body = JSON.stringify(this.state);
    this.running = (async () => {
      try {
        const response = await fetch('/api/listening-state', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body, keepalive: body.length < 60000
        });
        if (!response.ok) throw new Error();
        const payload = await response.json();
        this.accept(parseListeningState(payload.state));
        this.syncedRevision = revision;
        if (!this.disposed && !this.storageFailed) this.failed(null);
      } catch {
        if (!this.disposed) this.failed('Could not save listening progress to your account. Random is ready; retry saving when connected.');
      }
    })();
    await this.running;
    this.running = null;
    if (this.revision !== revision) await this.sync();
  }

  receiveStorage(value: string | null) {
    if (!value || this.disposed) return;
    try { this.accept(parseListeningState(JSON.parse(value))); } catch { /* Ignore corrupt external storage. */ }
  }

  dispose() {
    clearTimeout(this.timer);
    this.disposed = true;
  }
}
