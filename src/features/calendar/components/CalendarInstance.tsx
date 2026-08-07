import { memo, useRef, useDeferredValue } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-big-calendar';
import { useSettingsStore } from '@/stores/settingsStore';
import { FixedCalendarHeader } from '@/features/calendar/components/CalendarHeader';
import { resolveFrozenProps } from '../utils/resolveFrozenProps';
import { ViewLayer } from './ViewLayer';
import type { CalMode } from '../constants';
import type { GridEvent } from '../utils/toGridEvents';

interface LiveProps {
  events: GridEvent[];
  date: Date;
  height: number;
  hourRowHeight: number;
  weekStartsOn: 0 | 1;
  scrollOffset: number;
  onPressEvent: (event: any) => void;
  onPressCell: (d: Date) => void;
  onSwipeEnd: (d: Date) => void;
  renderEvent: (event: any, touchableOpacityProps: any) => any;
  eventCellStyle: (event: any) => any;
  bigCalendarTheme: any;
}

interface Props extends LiveProps {
  mode: CalMode;
  calendarKey: string;
  visible: boolean;
}

function CalendarInstanceImpl({ mode, calendarKey, visible, ...live }: Props) {
  const language = useSettingsStore((s) => s.language);
  const deferredLanguage = useDeferredValue(language);
  const frozen = useRef<LiveProps>(live);
  const { props, nextFrozen } = resolveFrozenProps(visible, live as LiveProps, frozen.current);
  frozen.current = nextFrozen;

  return (
    <ViewLayer visible={visible}>
      <View style={styles.wrapper}>
        <Calendar
          key={calendarKey}
          locale={deferredLanguage}
          events={props.events}
          mode={mode}
          date={props.date}
          height={props.height}
          hourRowHeight={props.hourRowHeight}
          timeslots={1}
          weekStartsOn={props.weekStartsOn}
          weekEndsOn={((props.weekStartsOn + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6}
          onPressEvent={props.onPressEvent}
          onPressCell={props.onPressCell}
          onSwipeEnd={props.onSwipeEnd}
          scrollOffsetMinutes={props.scrollOffset}
          renderHeader={FixedCalendarHeader}
          renderEvent={props.renderEvent}
          eventCellStyle={props.eventCellStyle}
          allDayEventCellStyle={props.eventCellStyle}
          theme={props.bigCalendarTheme}
        />
      </View>
    </ViewLayer>
  );
}

export const CalendarInstance = memo(CalendarInstanceImpl);

const styles = StyleSheet.create({
  wrapper: { flex: 1, overflow: 'hidden' },
});
