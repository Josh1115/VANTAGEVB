import { Modal } from '../ui/Modal';
import { HELP_ILLUSTRATIONS } from './helpContent';

export function HelpModal({ topic, onClose }) {
  if (!topic) return null;
  return (
    <Modal title={`${topic.icon} ${topic.label}`} onClose={onClose}>
      <div className="space-y-0 max-h-[65vh] overflow-y-auto -mx-1 px-1 no-scrollbar">
        {topic.content.map(({ heading, body, screenshot }, i) => {
          const Illustration = screenshot ? HELP_ILLUSTRATIONS[screenshot] : null;
          return (
            <div key={heading} className={`py-3.5 ${i < topic.content.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
              <p className="text-xs font-black uppercase tracking-wide text-primary mb-1.5">{heading}</p>
              {Illustration && (
                <div className="mb-2.5 rounded-lg overflow-hidden border border-slate-700/50">
                  <Illustration />
                </div>
              )}
              <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
