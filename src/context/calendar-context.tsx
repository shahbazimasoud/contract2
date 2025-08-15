
'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { format as formatFn, formatDistanceToNow as formatDistanceToNowFn, differenceInDays as differenceInDaysFn } from 'date-fns';
import { format as formatJalali, formatDistanceToNow as formatDistanceToNowJalali, differenceInDays as differenceInDaysJalali } from 'date-fns-jalali';
import type { AppearanceSettings } from '@/lib/types';
import { enUS, faIR } from 'date-fns/locale';

type CalendarSystem = 'gregorian' | 'persian';

const APPEARANCE_SETTINGS_KEY = 'appearance-settings';

interface CalendarContextType {
  calendarSystem: CalendarSystem;
  calendar: typeof gregorian | typeof persian;
  locale: typeof gregorian_en | typeof persian_fa;
  format: (date: Date | number, formatStr: string) => string;
  formatDistance: (date: Date | number) => string;
  differenceInDays: (dateLeft: Date | number, dateRight: Date | number) => number;
  dateFnsLocale: Locale,
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider = ({ children }: { children: React.ReactNode }) => {
  const [calendarSystem, setCalendarSystem] = useState<CalendarSystem>('gregorian');
  
  useEffect(() => {
    const savedSettings = localStorage.getItem(APPEARANCE_SETTINGS_KEY);
    if (savedSettings) {
      const settings: AppearanceSettings = JSON.parse(savedSettings);
      if (settings.calendarSystem) {
        setCalendarSystem(settings.calendarSystem);
      }
    }
  }, []);

  const value = useMemo(() => {
    if (calendarSystem === 'persian') {
      return {
        calendarSystem,
        calendar: persian,
        locale: persian_fa,
        format: (date: Date | number, formatStr: string) => formatJalali(date, formatStr, { locale: faIR }),
        formatDistance: (date: Date | number) => formatDistanceToNowJalali(date, { addSuffix: true, locale: faIR }),
        differenceInDays: (dateLeft: Date | number, dateRight: Date | number) => differenceInDaysJalali(dateLeft, dateRight),
        dateFnsLocale: faIR,
      };
    }
    return {
      calendarSystem,
      calendar: gregorian,
      locale: gregorian_en,
      format: (date: Date | number, formatStr: string) => formatFn(date, formatStr, { locale: enUS }),
      formatDistance: (date: Date | number) => formatDistanceToNowFn(date, { addSuffix: true, locale: enUS }),
      differenceInDays: (dateLeft: Date | number, dateRight: Date | number) => differenceInDaysFn(dateLeft, dateRight),
      dateFnsLocale: enUS,
    };
  }, [calendarSystem]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
