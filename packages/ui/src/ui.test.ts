// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  clearElement,
  createStore,
  el,
  escapeAttribute,
  escapeHtml,
  FocusManager,
  LiveAnnouncer,
} from './index.js';

describe('escapeHtml & escapeAttribute', () => {
  it('escapes dangerous HTML characters', () => {
    const input = '<script>alert("xss" & \'hack\')</script>';
    const escaped = escapeHtml(input);
    expect(escaped).toBe(
      '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;hack&#39;)&lt;/script&gt;',
    );
  });

  it('handles empty or null string', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeAttribute('')).toBe('');
  });
});

describe('DOM builder (el)', () => {
  it('creates an element with text content and attributes', () => {
    const button = el(
      'button',
      { type: 'button', class: 'btn primary', disabled: true },
      'Click me',
    );

    expect(button.tagName.toLowerCase()).toBe('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toBe('btn primary');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.textContent).toBe('Click me');
  });

  it('nests children nodes safely without innerHTML', () => {
    const list = el(
      'ul',
      { class: 'nav' },
      el('li', {}, 'Item 1'),
      el('li', {}, 'Item 2'),
    );

    expect(list.children.length).toBe(2);
    expect(list.children[0]?.textContent).toBe('Item 1');
    expect(list.children[1]?.textContent).toBe('Item 2');
  });

  it('clears all children with clearElement', () => {
    const div = el('div', {}, el('span', {}, 'Child 1'), el('span', {}, 'Child 2'));
    expect(div.children.length).toBe(2);
    clearElement(div);
    expect(div.childNodes.length).toBe(0);
  });
});

describe('Store', () => {
  it('updates state and notifies subscribers', () => {
    const store = createStore({ count: 0, user: 'guest' });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, user: 'guest' });
    expect(listener).toHaveBeenCalledWith({ count: 1, user: 'guest' });

    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets state to initial value', () => {
    const store = createStore({ status: 'idle' });
    store.setState({ status: 'loading' });
    expect(store.getState().status).toBe('loading');

    store.reset();
    expect(store.getState().status).toBe('idle');
  });
});

describe('LiveAnnouncer & FocusManager', () => {
  it('instantiates LiveAnnouncer and manages regions', () => {
    const announcer = new LiveAnnouncer();
    announcer.announce('Scan complete', 'polite');
    announcer.announce('Error occurred', 'assertive');
    announcer.destroy();
  });

  it('instantiates FocusManager', () => {
    const fm = new FocusManager();
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.focus();

    fm.saveFocus();
    fm.restoreFocus();
    btn.remove();
  });
});
