export interface StatsCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}
