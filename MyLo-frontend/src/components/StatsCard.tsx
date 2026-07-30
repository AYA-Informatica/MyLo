import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StatsCardProps } from '../types/startcardstypes';

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = 'neutral',
  className = '',
  valuePrefix = '',
  valueSuffix = '',
}) => {
  // Determine trend automatically if neutral
  const actualTrend =
    trend === 'neutral' ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : trend;

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const getTrendIcon = () => {
    if (actualTrend === 'up') return TrendingUp;
    if (actualTrend === 'down') return TrendingDown;
    return TrendingUp; // default
  };

  const TrendIcon = getTrendIcon();

  return (
    <div
      className={`p-6 w-[300px] bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {Icon && (
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon size={20} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {valuePrefix}
          {typeof value === 'number' ? value.toLocaleString() : value}
          {valueSuffix}
        </div>
      </div>

      {/* Trend indicator and change label */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <TrendIcon size={16} className={trendColors[actualTrend]} />
          <span className={`text-sm font-medium ${trendColors[actualTrend]}`}>
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        </div>
        <span className="text-sm text-gray-500">{changeLabel}</span>
      </div>
    </div>
  );
};

export default StatsCard;
