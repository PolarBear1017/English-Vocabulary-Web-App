import React from 'react';

const ProficiencyDots = ({ score = 0 }) => (
  <div className="flex items-center gap-1.5" title={`理解程度: ${score}/5`}>
    <div className={`h-2 w-12 rounded-full transition-colors duration-300 shadow-sm ${
      score <= 0 ? 'bg-gray-200' :
      score === 1 ? 'bg-red-500' :
      score === 2 ? 'bg-orange-500' :
      score === 3 ? 'bg-yellow-400' :
      score === 4 ? 'bg-lime-500' :
      'bg-green-600'
    }`} />
    <span className="text-xs font-bold text-gray-400">Lv.{score}</span>
  </div>
);

export default ProficiencyDots;
