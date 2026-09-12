import { useEffect } from 'react';

interface UseFormKeyboardOpts {
  onSave?: () => void;
  onSubmit?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}

export function useFormKeyboard({ onSave, onSubmit, onBack, onCancel, enabled = true }: UseFormKeyboardOpts) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if (e.key === 'Escape' && onBack && !isInput) {
        e.preventDefault();
        onBack();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onSave, onSubmit, onBack, onCancel]);
}
