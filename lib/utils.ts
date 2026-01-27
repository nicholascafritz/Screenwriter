import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function formatPageCount(lineCount: number): string {
  const pages = Math.ceil(lineCount / 56);
  return `${pages} page${pages !== 1 ? 's' : ''}`;
}
