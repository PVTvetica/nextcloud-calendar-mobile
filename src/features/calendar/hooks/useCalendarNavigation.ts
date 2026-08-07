import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCalendarStore } from '@/stores/calendarStore';
import { trailingDebounce } from '@/utils/debounce';
import type { AgendaViewHandle } from '@/features/calendar/components/AgendaView';
import type { ViewMode } from '@/types';
import { isCalMode } from '../constants';

const FETCH_DATE_DEBOUNCE_MS = 300;

export function useCalendarNavigation() {
  const viewMode = useCalendarStore((s) => s.viewMode);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const isCalendarMode = isCalMode(viewMode);

  const [date, setDateState] = useState(() => new Date());
  const [anchorDate, setAnchorDate] = useState(date);
  const [fetchDate, setFetchDate] = useState(date);
  const [agendaVisibleDate, setAgendaVisibleDate] = useState(date);
  const [jump, setJump] = useState<{ nonce: number; target: Date }>(() => ({ nonce: 0, target: date }));
  const agendaRef = useRef<AgendaViewHandle>(null);

  const fetchDebounce = useRef(
    trailingDebounce((d: Date) => setFetchDate(d), FETCH_DATE_DEBOUNCE_MS)
  ).current;

  const dateRef = useRef(date); dateRef.current = date;
  const viewModeRef = useRef(viewMode); viewModeRef.current = viewMode;
  const agendaVisibleDateRef = useRef(agendaVisibleDate);
  agendaVisibleDateRef.current = agendaVisibleDate;

  /**
   * A jump (Today, a date picked in the month view, month navigation).
   *
   * The anchor deliberately does NOT move. The pager is infinite, so any date
   * is reachable as an index from a fixed anchor, and moving the anchor would
   * invalidate every cached page and rebuild the whole grid — which is what
   * made Today feel like a remount. `jump` carries the target to the grid,
   * which animates to it. It changes only on a jump, never on a swipe, so it
   * does not churn the grid's props while paging.
   */
  const setDate = useCallback((d: Date) => {
    fetchDebounce.cancel();
    setDateState(d);
    setFetchDate(d);
    setJump((j) => ({ nonce: j.nonce + 1, target: d }));
  }, [fetchDebounce]);

  /** A swipe: the anchor stays put so the pager keeps its index. */
  const onPageChange = useCallback((d: Date) => {
    setDateState(d);
    fetchDebounce.call(d);
  }, [fetchDebounce]);

  useEffect(() => { if (viewMode === 'schedule') setAgendaVisibleDate(date); }, [date, viewMode]);

  const switchMode = useCallback((target: ViewMode) => {
    const focus = viewModeRef.current === 'schedule'
      ? agendaVisibleDateRef.current
      : dateRef.current;
    // Mode switch is the one case that re-anchors: the page span changes, so
    // every cached page is invalid regardless, and making page 0 the focus page
    // means the grid lands on it without animating from an unrelated index.
    if (target !== 'schedule') {
      setAnchorDate(focus);
      setDate(focus);
    }
    setViewMode(target);
  }, [setViewMode, setDate]);

  const goToday = useCallback(() => {
    const now = new Date();
    setDate(now);
    if (viewModeRef.current === 'schedule') {
      setAgendaVisibleDate(now);
      agendaRef.current?.scrollToToday();
    }
  }, [setDate]);

  const navigateMonth = useCallback((dir: 1 | -1) => {
    setDate(dayjs(dateRef.current).add(dir, 'month').toDate());
  }, [setDate]);

  return {
    viewMode,
    isCalendarMode,
    date,
    anchorDate,
    jump,
    fetchDate,
    setDate,
    agendaVisibleDate,
    setAgendaVisibleDate,
    agendaRef,
    switchMode,
    goToday,
    navigateMonth,
    onPageChange,
  };
}
