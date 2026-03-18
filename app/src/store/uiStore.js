import { create } from 'zustand';

export const useUiStore = create((set) => ({
  toast: null,

  showToast: (message, variant = 'info') => {
    set({ toast: { message, variant } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

export const selectToast     = (s) => s.toast;
export const selectShowToast = (s) => s.showToast;
