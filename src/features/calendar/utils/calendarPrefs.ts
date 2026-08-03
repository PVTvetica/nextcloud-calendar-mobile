
export function isCalendarVisible(id: string, hidden: string[]): boolean {
  return !hidden.includes(id);
}

export function notifiesFor(id: string, hidden: string[], notifDisabled: string[]): boolean {
  return isCalendarVisible(id, hidden) && !notifDisabled.includes(id);
}

export function inWidgetFor(id: string, hidden: string[], widgetDisabled: string[]): boolean {
  return isCalendarVisible(id, hidden) && !widgetDisabled.includes(id);
}
