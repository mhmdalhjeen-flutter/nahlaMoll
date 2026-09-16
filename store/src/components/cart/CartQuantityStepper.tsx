'use client';

import { QuantityStepper } from '@/components/ui/QuantityStepper';

interface CartQuantityStepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  max?: number;
  min?: number;
  size?: 'sm' | 'md';
  variant?: 'card' | 'inline';
  disabled?: boolean;
  className?: string;
}

/** Cart/product quantity control — segmented layout with clear disabled states. */
export function CartQuantityStepper({
  quantity,
  onIncrease,
  onDecrease,
  max,
  min = 0,
  variant = 'card',
  disabled = false,
  className,
}: CartQuantityStepperProps) {
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={stop} className={className}>
      <QuantityStepper
        quantity={quantity}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        min={min}
        max={max}
        disabled={disabled}
        fullWidth={variant === 'card'}
      />
    </div>
  );
}
