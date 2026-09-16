'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  const switchId = id ?? label;

  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label htmlFor={switchId} className="block text-sm font-medium text-gray-900 cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? '-translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
