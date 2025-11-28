interface StatsCardProps {
  label: string;
  value: string | number;
}

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <div className="group bg-card p-8 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border hover:-translate-y-1">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        {label}
      </p>
      <p className="text-5xl font-serif text-primary group-hover:text-accent transition-colors duration-300">
        {value}
      </p>
    </div>
  );
}
