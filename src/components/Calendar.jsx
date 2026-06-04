"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";
import styles from "./Calendar.module.css";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

export const DEFAULT_SLOTS = ["10:00", "14:00", "18:00"];

export function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function monthLabel(date) {
  const label = MONTH_FORMATTER.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

export default function Calendar({
  monthDate,
  onMonthChange,
  availability = {},
  selectedDate,
  onSelectDate,
  admin = false,
}) {
  const days = buildMonthDays(monthDate);
  const reduceMotion = useReducedMotion();
  const todayKey = toDateKey(new Date());

  function changeMonth(offset) {
    const nextMonth = new Date(monthDate);
    nextMonth.setMonth(monthDate.getMonth() + offset);
    onMonthChange(nextMonth);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className="label-caps">{monthLabel(monthDate)}</span>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Mes anterior"
            onClick={() => changeMonth(-1)}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Mes siguiente"
            onClick={() => changeMonth(1)}
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAYS.map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={toMonthKey(monthDate)}
          className={styles.grid}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {days.map((day) => {
            const daySlots = availability[day.dateKey]?.slots || [];
            const hasOpenSlots = admin || daySlots.some((slot) => !slot.booked);
            const isSelected = selectedDate === day.dateKey;
            const isDisabled = !day.isCurrentMonth || !hasOpenSlots;
            const isToday = day.dateKey === todayKey;

            return (
              <button
                key={day.dateKey}
                type="button"
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={[
                  styles.day,
                  day.isCurrentMonth ? "" : styles.muted,
                  daySlots.length ? styles.open : "",
                  isSelected ? styles.selected : "",
                  isToday ? styles.today : "",
                ].join(" ")}
                onClick={() => onSelectDate(day.dateKey)}
              >
                <span>{day.day}</span>
                {daySlots.length ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
