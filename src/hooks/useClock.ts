import { useState, useEffect } from 'react';

/**
 * Custom hook that provides real-time clock functionality
 * Updates every second using timestamps for accuracy
 */
export const useClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update immediately
    setCurrentTime(new Date());

    // Set up interval to update every second
    // Using Date.now() for better accuracy instead of incrementing
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Helper functions to format time components
  const getFormattedTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getFormattedDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getHours = () => currentTime.getHours();
  const getMinutes = () => currentTime.getMinutes();
  const getSeconds = () => currentTime.getSeconds();

  return {
    currentTime,
    formattedTime: getFormattedTime(),
    formattedDate: getFormattedDate(),
    hours: getHours(),
    minutes: getMinutes(),
    seconds: getSeconds(),
  };
};
