import { useState, useCallback } from 'react';

export interface FieldError {
  key: string;
  message: string;
}

export function useFormValidation() {
  const [errors, setErrors] = useState<FieldError[]>([]);

  const validate = useCallback((fields: { key: string; label: string; required?: boolean }[], form: Record<string, unknown>): FieldError[] => {
    const errs: FieldError[] = [];
    for (const f of fields) {
      if (f.required) {
        const val = form[f.key];
        const str = val == null ? '' : String(val).trim();
        if (!str) {
          errs.push({ key: f.key, message: `${f.label.replace(' *', '')} is required` });
        }
      }
    }
    setErrors(errs);
    return errs;
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  const fieldError = useCallback((key: string) => errors.find((e) => e.key === key), [errors]);

  const hasError = useCallback((key: string) => errors.some((e) => e.key === key), [errors]);

  return { errors, validate, clearErrors, fieldError, hasError };
}
