export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold text-card-foreground">{title}</h3>
      {description && <p className="mb-3 text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
