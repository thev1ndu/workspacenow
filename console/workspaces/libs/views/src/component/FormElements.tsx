import type { ReactNode } from "react";
import { Description, FieldError, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";

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
  return (
    <TextField
      className="flex w-full flex-col gap-1.5"
      value={value}
      onChange={onChange}
      isRequired={required}
      isInvalid={!!error}
      isDisabled={disabled}
      type={type}
    >
      <Label>{label}</Label>
      {multiline ? <TextArea variant="secondary" placeholder={placeholder} rows={rows ?? 3} /> : <Input variant="secondary" placeholder={placeholder} />}
      {helperText && !error && <Description>{helperText}</Description>}
      <FieldError>{error}</FieldError>
    </TextField>
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
  return (
    <Select variant="secondary"
      className="flex w-full flex-col gap-1.5"
      value={value || null}
      onChange={(key) => onChange(key == null ? "" : String(key))}
      isRequired={required}
      isInvalid={!!error}
      isDisabled={disabled}
      placeholder={placeholder ?? "Select…"}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {helperText && !error && <Description>{helperText}</Description>}
      <FieldError>{error}</FieldError>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
