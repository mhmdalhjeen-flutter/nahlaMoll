'use client';

interface FormFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, hint, required, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        {label}
        {required && <span className="text-error-500 mr-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}
