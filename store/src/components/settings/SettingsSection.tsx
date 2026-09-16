'use client';

import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      <h2 className="text-xs font-semibold text-gray-500 mb-2 px-1">{title}</h2>
      <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100 overflow-hidden">
        {children}
      </div>
    </section>
  );
}
