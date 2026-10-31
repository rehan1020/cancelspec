// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export type Listener<T> = (state: T) => void;

export interface Store<T> {
  getState(): T;
  setState(updater: Partial<T> | ((prevState: T) => Partial<T>)): void;
  subscribe(listener: Listener<T>): () => void;
  reset(): void;
}

export function createStore<T extends Record<string, unknown>>(initialState: T): Store<T> {
  let state = { ...initialState };
  const listeners = new Set<Listener<T>>();

  return {
    getState(): T {
      return state;
    },

    setState(updater: Partial<T> | ((prevState: T) => Partial<T>)): void {
      const nextPartial = typeof updater === 'function' ? updater(state) : updater;
      state = { ...state, ...nextPartial };
      for (const listener of listeners) {
        listener(state);
      }
    },

    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    reset(): void {
      state = { ...initialState };
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}
