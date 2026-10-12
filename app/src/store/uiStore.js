import { create } from 'zustand';

let toastTimerId = null;

export const useUiStore = create((set) => ({
  toast: null,
  upgradeNudge: null,

  showToast: (message, variant = 'info') => {
    clearTimeout(toastTimerId);
    // id re-triggers the pop animation when the same message shows twice in a row.
    set({ toast: { message, variant, id: Date.now() } });
    // Undo toasts stay up longer — coaches glance back at the court mid-rally.
    toastTimerId = setTimeout(() => set({ toast: null }), variant === 'undo' ? 4000 : 3000);
  },

  // Popup nudging a trial user to upgrade, shown when they hit their
  // second-to-last (4 of 5) or last (5 of 5) match slot.
  showUpgradeNudge: (used, limit) => set({ upgradeNudge: { used, limit } }),
  closeUpgradeNudge: () => set({ upgradeNudge: null }),
}));

export const selectToast             = (s) => s.toast;
export const selectShowToast         = (s) => s.showToast;
export const selectUpgradeNudge      = (s) => s.upgradeNudge;
export const selectShowUpgradeNudge  = (s) => s.showUpgradeNudge;
export const selectCloseUpgradeNudge = (s) => s.closeUpgradeNudge;
