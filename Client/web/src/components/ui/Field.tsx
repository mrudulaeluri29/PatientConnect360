import type { ReactNode } from "react";
import "./Field.css";

interface FieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}

export default function Field({ label, helperText, error, htmlFor, required = false, children }: FieldProps) {
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-field__label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="ui-field__required">*</span> : null}
        </label>
      ) : null}
      <div className="ui-field__control">{children}</div>
      {helperText ? <div className="ui-field__helper">{helperText}</div> : null}
      {error ? <div className="ui-field__error">{error}</div> : null}
    </div>
  );
}
