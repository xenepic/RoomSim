import { useEffect, useState } from 'react';

interface NumFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  placeholder?: string;   // shown when empty (allowEmpty)
  allowEmpty?: boolean;   // empty input = undefined (e.g. "use the default")
  autoFocus?: boolean;
}

const parse = (text: string) => {
  const v = parseFloat(text.trim().replace(',', '.'));
  return isNaN(v) ? null : Math.round(v * 10) / 10;
};

// Number input that keeps what is being typed ("12." / "-") while passing valid
// values on, and follows external changes (drag, undo) when they differ.
export function NumField({ label, value, onChange, min, placeholder, allowEmpty, autoFocus }: NumFieldProps) {
  const [text, setText] = useState(value?.toString() ?? '');

  useEffect(() => {
    if (parse(text) !== (value ?? null)) setText(value?.toString() ?? '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label>{label}</label>
      <input
        type="text" inputMode="decimal" value={text} placeholder={placeholder} autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          const v = parse(e.target.value);
          if (v === null) { if (allowEmpty && e.target.value.trim() === '') onChange(undefined); return; }
          if (min !== undefined && v < min) return;
          onChange(v);
        }}
        // Leaving the field shows the value actually applied
        onBlur={() => setText(value?.toString() ?? '')}
      />
    </div>
  );
}
