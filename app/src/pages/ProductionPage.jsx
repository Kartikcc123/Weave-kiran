import React from 'react';
import ProductionStatus from '../components/ProductionStatus';
import DefectSummary from '../components/DefectSummary';
import RecentDefects from '../components/RecentDefects';

export default function ProductionPage() {
  return (
    <div className="h-full p-4 flex flex-col gap-4 bg-[#F7F7F7]">
      <div className="flex-none grid grid-cols-2 gap-4">
        <ProductionStatus />
        <DefectSummary />
      </div>
      
      <div className="flex-1">
        <RecentDefects />
      </div>
    </div>
  );
}
