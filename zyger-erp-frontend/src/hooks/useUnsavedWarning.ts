import { useEffect, useRef } from 'react';

export function useUnsavedWarning(isDirty: boolean) {
  const savedRef = useRef(isDirty);

  useEffect(() => {
    savedRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (savedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
