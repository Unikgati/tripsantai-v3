import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value?: string; // ISO date yyyy-mm-dd
  onChange?: (iso: string) => void;
  minDate?: string; // ISO date
}

const pad = (n: number) => String(n).padStart(2, '0');

const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const weekdayLabels = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, minDate }) => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (value) setCurrentDate(new Date(value + 'T00:00:00'));
  }, [value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const handlePrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1));
  const handleNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1));

  const handleSelect = (day: number) => {
    const selected = new Date(year, month, day);
    const iso = isoDate(selected);
    onChange && onChange(iso);
    setOpen(false);
  };

  const min = minDate ? new Date(minDate + 'T00:00:00') : today;

  const days: React.ReactNode[] = [];
  for (let i = 0; i < startingDay; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    dt.setHours(0,0,0,0);
    const isDisabled = dt < min;
    const isToday = dt.getTime() === today.getTime();
    const isSelected = value === isoDate(dt);
    days.push(
      <button
        key={d}
        type="button"
        className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={() => !isDisabled && handleSelect(d)}
        disabled={isDisabled}
      >{d}</button>
    );
  }

  const displayLabel = value ? new Date(value + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih Tanggal';

  return (
    <div className="date-picker" ref={wrapperRef}>
      <button type="button" className="date-picker-input" onClick={() => setOpen(v => !v)}>{displayLabel}</button>
      {open && (
        <div className="calendar-container">
          <div className="calendar-header">
            <button type="button" onClick={handlePrev}>&lt;</button>
            <span>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentDate)}</span>
            <button type="button" onClick={handleNext}>&gt;</button>
          </div>
          <div className="calendar-weekdays">{weekdayLabels.map((w,i)=><div key={i}>{w}</div>)}</div>
          <div className="calendar-grid">{days}</div>
          <div className="calendar-footer">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => { onChange && onChange(''); setOpen(false); }}>Hapus Tanggal</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
