export function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">{title}</h3>
      {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{description}</p>}
      {children}
    </div>
  );
}
