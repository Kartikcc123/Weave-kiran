import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#E5E5E5] flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#111111] tracking-tight">FABRIC AI</span>
          <span className="text-sm text-[#666666]">AI Fabric Inspection</span>
        </div>

        {/* Top Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium border-l border-[#E5E5E5] pl-6 h-8">
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "text-[#111111]" : "text-[#666666] hover:text-[#111111]"}
            end
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/live" 
            className={({ isActive }) => isActive ? "text-[#111111]" : "text-[#666666] hover:text-[#111111]"}
          >
            Live Inspection
          </NavLink>
          <NavLink 
            to="/production" 
            className={({ isActive }) => isActive ? "text-[#111111]" : "text-[#666666] hover:text-[#111111]"}
          >
            Production Data
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#111111]">LOOM 01</span>
          <span className="h-2 w-2 rounded-full bg-[#16A34A]"></span>
          <span className="text-sm font-medium text-[#16A34A]">RUNNING</span>
        </div>
        
        <div className="h-6 w-px bg-[#E5E5E5]"></div>

        <div className="text-sm text-[#666666] font-mono">
          {time.toLocaleTimeString([], { hour12: false })}
        </div>
      </div>
    </header>
  );
}
