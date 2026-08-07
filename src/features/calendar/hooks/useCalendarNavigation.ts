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
  const agendaRef = useRef<AgendaViewHandle>(null);

  const fetchDebounce = useRef(
    trailingDebounce((d: Date) => setFetchDate(d), FETCH_DATE_DEBOUNCE_MS)
  ).current;

  const dateRef = useRef(date); dateRef.current = date;
  const viewModeRef = useRef(viewMode); viewModeRef.current = viewMode;
  const agendaVisibleDateRef = useRef(agendaVisibleDate);
  agendaVisibleDateRef.current = agendaVisibleDate;

  /** A jump: move the view and re-anchor the pager on the target. */
  const setDate = useCallback((d: Date) => {
    fetchDebounce.cancel();
    setDateState(d);
    setAnchorDate(d);
    setFetchDate(d);
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
    if (target !== 'schedule') setDate(focus);
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
