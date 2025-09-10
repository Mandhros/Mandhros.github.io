import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { LapIcon, StopIcon } from './Icons';

export interface StopwatchHandle {
  getTime: () => number;
}

interface StopwatchProps {
  onFinish: (elapsedTime: number) => void;
}

export const formatTime = (timeInSeconds: number) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return [hours, minutes, seconds]
    .map(v => v < 10 ? '0' + v : v)
    .join(':');
};


const Stopwatch = forwardRef<StopwatchHandle, StopwatchProps>(({ onFinish }, ref) => {
  const [totalTime, setTotalTime] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [showLap, setShowLap] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setTotalTime(prevTime => prevTime + 1);
      if (showLap) {
        setLapTime(prevLap => prevLap + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showLap]);
  
  useImperativeHandle(ref, () => ({
      getTime: () => totalTime,
  }));

  const handleLap = () => {
    setShowLap(true);
    setLapTime(0);
  };

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onFinish(totalTime);
  };
  
  return (
    <div className="bg-surface p-4 rounded-b-lg shadow-lg text-center sticky top-0 z-10">
      <div className="text-5xl font-mono tracking-widest text-white mb-2">
        {showLap ? formatTime(lapTime) : formatTime(totalTime)}
      </div>
      {showLap && (
        <div className="text-lg text-text-secondary">
          Total: {formatTime(totalTime)}
        </div>
      )}
      <div className="flex justify-center space-x-4 mt-2">
        <button onClick={handleLap} className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-colors">
            <LapIcon className="w-5 h-5 mr-2" /> Tour
        </button>
        <button onClick={handleStop} className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors">
            <StopIcon className="w-5 h-5 mr-2" /> Fin
        </button>
      </div>
    </div>
  );
});

export default Stopwatch;
