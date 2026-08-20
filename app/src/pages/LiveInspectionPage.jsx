import React from 'react';
import LiveInspection from '../components/LiveInspection';

export default function LiveInspectionPage() {
  return (
    <div className="h-full p-4 flex flex-col bg-[#F7F7F7]">
      <div className="flex-1">
        <LiveInspection />
      </div>
    </div>
  );
}
