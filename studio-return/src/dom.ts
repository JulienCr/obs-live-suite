/** Cached DOM references — call initDom() once at startup */

let notificationEl!: HTMLElement;
let titleEl!: HTMLElement;
let bodyEl!: HTMLElement;

export function initDom(): void {
  notificationEl = document.getElementById("notification")!;
  titleEl = document.getElementById("notification-title")!;
  bodyEl = document.getElementById("notification-body")!;
}

export function getNotificationEl(): HTMLElement {
  return notificationEl;
}

export function setTitle(text: string): void {
  titleEl.textContent = text;
}

export function setBody(text: string): void {
  bodyEl.textContent = text;
}
