import { useState, useEffect } from 'react';

/**
 * Hook for countdown timer - used for grant expiry countdowns
 */
export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  useEffect(() => {
    if (!targetDate) return;
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function calculateTimeLeft(targetDate) {
  if (!targetDate) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const target = new Date(targetDate);
  if (isNaN(target.getTime())) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const diff = target.getTime() - Date.now();

  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    expired: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff
  };
}

/**
 * Format a wallet address for display
 */
export function formatWallet(address) {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date and time
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
