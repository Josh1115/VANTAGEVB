import { Modal } from '../ui/Modal';
import { Confetti } from '../ui/Confetti';
import { Button } from '../ui/Button';

// One-time announcement popup shown on the dashboard to every account
// (trial, master, or paid) the first time they log in on or after
// Aug 13 2026. See HomePage.jsx for the show-once logic.
export function SeasonKickoffModal({ onClose }) {
  return (
    <>
      <Confetti />
      <Modal
        title="🏐 Good luck!"
        onClose={onClose}
        footer={<Button variant="primary" onClick={onClose}>Thanks!</Button>}
      >
        <p className="text-sm text-slate-300 text-center">
          Best of luck to begin your 2026 season and beyond!
        </p>
      </Modal>
    </>
  );
}
