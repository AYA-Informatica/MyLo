import React from 'react';
import type { LawCategoryProps } from '../types/lawCategoryTypes';

const LawCategory: React.FC<LawCategoryProps> = ({ icon, name, description, onClick }) => (
  <div
    className="flex items-center gap-4 bg-white rounded-lg p-4 shadow cursor-pointer hover:bg-secondary-100 transition"
    onClick={onClick}
  >
    {icon && <div className="text-primary-800 text-2xl">{icon}</div>}
    <div>
      <div className="text-lg font-semibold text-secondary-500">{name}</div>
      <div className="text-secondary-400 text-base">{description}</div>
    </div>
  </div>
);

export default LawCategory;
