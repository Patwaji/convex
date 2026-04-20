import { create } from 'zustand';

export type GlobalAlertType = 'success' | 'error' | 'warning' | 'info';

interface GlobalAlertState {
  visible: boolean;
  type: GlobalAlertType;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
  show: (payload: {
    type: GlobalAlertType;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  }) => void;
  hide: () => void;
}

export const useGlobalAlertStore = create<GlobalAlertState>((set) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  confirmText: undefined,
  onConfirm: undefined,
  show: ({ type, title, message, confirmText, onConfirm }) =>
    set({
      visible: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    }),
  hide: () =>
    set({
      visible: false,
      title: '',
      message: '',
      confirmText: undefined,
      onConfirm: undefined,
    }),
}));

export const triggerGlobalAlert = (payload: {
  type: GlobalAlertType;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}) => {
  useGlobalAlertStore.getState().show(payload);
};
