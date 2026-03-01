interface CurrencyBadgeProps {
  icon: React.ReactNode;
  amount: number | null;
}

export function CurrencyBadge({ icon, amount }: CurrencyBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 border rounded-full px-3 py-1 bg-accent/10 border-accent/30">
      {icon}
      <span className="font-display font-bold text-sm tabular-nums text-accent">
        {amount ?? "..."}
      </span>
    </div>
  );
}
