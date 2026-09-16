export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
      {action && <div className="w-full sm:w-auto shrink-0">{action}</div>}
    </div>
  );
}
