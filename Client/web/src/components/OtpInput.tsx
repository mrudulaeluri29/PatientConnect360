import React, { useRef, useEffect } from "react";

export default function OtpInput({ length = 6, value, onChange, error }: { length?: number; value: string; onChange: (v: string) => void; error?: boolean }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // focus first empty
    const idx = value.length < length ? value.length : length - 1;
    inputs.current[idx]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const ch = e.target.value.replace(/[^0-9]/g, "").slice(-1);
    const arr = value.split("");
    arr[idx] = ch;
    const next = arr.join("");
    onChange(next);
    if (ch && idx < length - 1) inputs.current[idx + 1]?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      const arr = value.split("");
      arr[idx - 1] = "";
      onChange(arr.join(""));
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (paste) onChange(paste.padEnd(length, "").slice(0, length));
    e.preventDefault();
  };

  const cells = [];
  for (let i = 0; i < length; i++) {
    cells.push(
      <input
        key={i}
        ref={(el) => (inputs.current[i] = el)}
        value={value[i] || ""}
        onChange={(e) => handleChange(e, i)}
        onKeyDown={(e) => handleKey(e as any, i)}
        onPaste={handlePaste}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={1}
        className={`otp-box ${error ? "error" : ""}`}
        aria-label={`Digit ${i + 1}`}
      />
    );
  }

  return <div className="otp-input-row">{cells}</div>;
}
