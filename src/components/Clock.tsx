import { useClock } from '../hooks/useClock';
import './Clock.css';

/**
 * Clock component that displays real-time time and date
 * Always visible in the Dashboard view
 */
export const Clock = () => {
  const { formattedTime, formattedDate } = useClock();

  return (
    <div className="clock-widget">
      <div className="clock-time">{formattedTime}</div>
      <div className="clock-date">{formattedDate}</div>
    </div>
  );
};
