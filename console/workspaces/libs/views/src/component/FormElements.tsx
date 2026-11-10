import { useId, type ReactNode } from "react";
import { Select, SelectItem, TextArea, TextInput as CarbonTextInput } from "@carbon/react";

interface BaseProps {
  label: string;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
}

/** A labelled text field; set `multiline` for a text area. */
export function TextInput({
  label,
  helperText,
  error,
  required,
  value,
  onChange,
  multiline,
  rows,
  type,
  placeholder,
  disabled,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const labelText = required ? `${label} *` : label;
  if (multiline) {
    return (
      <TextArea
        id={id}
        className="w-full"
        labelText={labelText}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows ?? 3}
        invalid={!!error}
        invalidText={error}
        helperText={error ? undefined : typeof helperText === "string" ? helperText : undefined}
      />
    );
  }
  return (
    <CarbonTextInput
      id={id}
      className="w-full"
      labelText={labelText}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      invalid={!!error}
      invalidText={error}
      helperText={error ? undefined : typeof helperText === "string" ? helperText : undefined}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectInput({
  label,
  helperText,
  error,
  required,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Select
      id={id}
      className="w-full"
      labelText={required ? `${label} *` : label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      invalid={!!error}
      invalidText={error}
      helperText={error ? undefined : typeof helperText === "string" ? helperText : undefined}
    >
      {placeholder && (
        <SelectItem value="" text={placeholder} />
      )}
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value} text={option.label} />
      ))}
    </Select>
  );
}
