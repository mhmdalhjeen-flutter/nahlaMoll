import { cn } from '@/lib/utils';

interface DeliveryScooterIconProps {
  className?: string;
  /** Accent color class for the scooter body */
  accentClassName?: string;
}

/** Lightweight delivery scooter mark — orange commerce accent */
export function DeliveryScooterIcon({
  className,
  accentClassName = 'text-cta-600',
}: DeliveryScooterIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('w-5 h-5', className)}
      aria-hidden="true"
    >
      <circle cx="6.5" cy="17.5" r="2.5" className={accentClassName} fill="currentColor" />
      <circle cx="17.5" cy="17.5" r="2.5" className={accentClassName} fill="currentColor" />
      <path
        d="M4 17.5h1.2M19.8 17.5H20M7.5 17.5h8M9.5 12.5h4.5l2-4h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={accentClassName}
      />
      <path
        d="M9 12.5V9.5a2 2 0 0 1 2-2h3.5l1.5 3 1 2.5H9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className={accentClassName}
      />
    </svg>
  );
}
