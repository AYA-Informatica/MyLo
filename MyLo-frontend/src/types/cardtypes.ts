import type React from 'react';

export interface CardProps {
  title: string;
  description?: string;
  bulletPoints?: string[];
  icon?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bulletPointClassName?: string;
  bulletIcon?: React.ReactNode;
}
