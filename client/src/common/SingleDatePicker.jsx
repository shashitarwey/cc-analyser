import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import 'react-day-picker/style.css';

import { fmtDate, fmtDisplay } from '../utils/formatters';

export default function SingleDatePicker({ value, onChange, placeholder = "Select Date", maxDate, className, disabled }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Lock body scroll when picker is open
  useEffect(() => {
    if (open) {
      document.body.classList.add('picker-open');
    } else {
      document.body.classList.remove('picker-open');
    }
    return () => document.body.classList.remove('picker-open');
  }, [open]);

  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date) => {
    if (date) {
      onChange(fmtDate(date));
      setOpen(false);
    }
  };

  return (
    <div className={`date-picker-dropdown ${className || ''}`} ref={containerRef}>
      <button
        type="button"
        className="form-input d-flex items-center justify-between w-full"
        onClick={() => !disabled && setOpen(!open)}
        style={{ paddingRight: 16, opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="d-flex items-center gap-8">
          <CalendarIcon size={16} className="text-muted" />
          <span style={{ color: value ? 'var(--text)' : 'var(--text-muted)' }}>
            {value ? fmtDisplay(value) : placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`date-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="date-picker-popover fade-in">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            max={maxDate ? parseISO(maxDate) : undefined}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
