export function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface px-5 py-4 dark:border-outline-variant dark:bg-surface">
      <h3 className="text-sm font-bold text-text-primary dark:text-text-primary mb-1">{title}</h3>
      {description && <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mb-3">{description}</p>}
      {children}
    </div>
  );
}
