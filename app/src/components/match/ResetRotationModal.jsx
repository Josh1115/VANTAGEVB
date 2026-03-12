import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function ResetRotationModal({ onConfirm, onCancel }) {
  const [rotNum,  setRotNum]  = useState(1);
  const [serving, setServing] = useState(true);

  return (
    <Modal
      title="Reset to Rotation"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(rotNum, serving)}>Reset</Button>
        </>
      }
    >
      <p className="text-slate-400 text-sm mb-4">
        Pick the rotation number and whether your team is serving or receiving.
        The lineup will reset to that rotation without changing the score.
      </p>

      {/* Rotation picker */}
      <div className="mb-5">
        <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Rotation</div>
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setRotNum(n)}
              className={`rounded-xl py-3 text-lg font-black transition-colors ${
                rotNum === n
                  ? 'bg-primary text-white'
                  : 'bg-slate-700 text-slate-300 active:brightness-75'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Serving / Receiving toggle */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Side</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setServing(true)}
            className={`rounded-xl py-3 text-sm font-bold transition-colors ${
              serving
                ? 'bg-primary text-white'
                : 'bg-slate-700 text-slate-300 active:brightness-75'
            }`}
          >
            Serving
          </button>
          <button
            onClick={() => setServing(false)}
            className={`rounded-xl py-3 text-sm font-bold transition-colors ${
              !serving
                ? 'bg-primary text-white'
                : 'bg-slate-700 text-slate-300 active:brightness-75'
            }`}
          >
            Receiving
          </button>
        </div>
      </div>
    </Modal>
  );
}
