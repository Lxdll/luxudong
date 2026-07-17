import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="my-8 p-6 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-4">
      <div className="text-zinc-400">Current count is:</div>
      <div className="text-2xl font-bold text-white font-mono w-12 text-center">{count}</div>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors font-medium"
      >
        Increment
      </button>
      <button 
        onClick={() => setCount(0)}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
      >
        Reset
      </button>
    </div>
  );
};
