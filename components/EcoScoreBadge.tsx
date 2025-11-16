type Props = {
  score: number; // 0-100
  size?: number; // px, optional
};

export function EcoScoreBadge({ score, size = 28 }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = clamped >= 70 ? 'green' : clamped >= 40 ? 'yellow' : 'red';
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };
  const style = { width: size, height: size, minWidth: size } as React.CSSProperties;
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border font-semibold ${colorClasses[color]}`}
      style={style}
      title={`EcoScore ${clamped}`}
      aria-label={`EcoScore ${clamped}`}
    >
      <span className="text-xs leading-none">{clamped}</span>
    </div>
  );
}

