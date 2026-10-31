// SPDX-FileCopyrightText: 2026 CancelSpec contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

export type Child = Node | string | number | boolean | null | undefined;

export function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attrs: Record<string, string | number | boolean | undefined | null> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    if (key === 'className' || key === 'class') {
      element.className = String(value);
    } else if (key === 'textContent') {
      element.textContent = String(value);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
