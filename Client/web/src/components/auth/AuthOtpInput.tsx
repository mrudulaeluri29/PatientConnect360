import { useEffect, useMemo, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
};

function digitsOnly(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

export default function AuthOtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => digitsOnly(value, length), [length, value]);
  const slots = Array.from({ length }, (_, index) => digits[index] ?? "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      refs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  const focusIndex = (index: number) => {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  };

  const handleChange = (index: number, inputValue: string) => {
    const sanitized = digitsOnly(inputValue, length);
    if (!sanitized) {
      const next = digits.slice(0, index) + digits.slice(index + 1);
      onChange(next);
      return;
    }

    const next = `${digits.slice(0, index)}${sanitized}${digits.slice(index + sanitized.length)}`.slice(0, length);
    onChange(next);
    focusIndex(index + sanitized.length);
  };

  const handlePaste = (index: number, pasted: string) => {
    const sanitized = digitsOnly(pasted, length - index);
    if (!sanitized) return;
    const next = `${digits.slice(0, index)}${sanitized}${digits.slice(index + sanitized.length)}`.slice(0, length);
    onChange(next);
    focusIndex(index + sanitized.length);
  };

  return (
    <div className={`auth-otp${invalid ? " is-invalid" : ""}${digits.length === length ? " is-complete" : ""}`}>
      {slots.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className="auth-otp__slot"
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              if (slots[index]) {
                onChange(digits.slice(0, index) + digits.slice(index + 1));
              } else {
                onChange(digits.slice(0, Math.max(0, index - 1)) + digits.slice(index));
                focusIndex(index - 1);
              }
              event.preventDefault();
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusIndex(index - 1);
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              focusIndex(index + 1);
            }
          }}
          onFocus={(event) => event.currentTarget.select()}
          onPaste={(event) => {
            event.preventDefault();
            handlePaste(index, event.clipboardData.getData("text"));
          }}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
