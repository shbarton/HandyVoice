import React from "react";
import SelectComponent from "react-select";
import CreatableSelect from "react-select/creatable";
import type {
  ActionMeta,
  Props as ReactSelectProps,
  SingleValue,
  StylesConfig,
} from "react-select";

export type SelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type BaseProps = {
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  onChange: (value: string | null, action: ActionMeta<SelectOption>) => void;
  onBlur?: () => void;
  className?: string;
  formatCreateLabel?: (input: string) => string;
};

type CreatableProps = {
  isCreatable: true;
  onCreateOption: (value: string) => void;
};

type NonCreatableProps = {
  isCreatable?: false;
  onCreateOption?: never;
};

export type SelectProps = BaseProps & (CreatableProps | NonCreatableProps);

// Updated to match the "Architectural Paper" theme
// Using CSS variables defined in App.css

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44, // Slightly taller for better touch targets
    borderRadius: "0.75rem", // Rounded-xl to match theme
    borderColor: state.isFocused ? "var(--primary)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 1px var(--primary)" : "none",
    backgroundColor: "var(--card)", // White card background
    fontSize: "0.875rem",
    color: "var(--foreground)",
    transition: "all 200ms ease",
    ":hover": {
      borderColor: "var(--primary)",
      backgroundColor: "var(--card)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingInline: 12,
    paddingBlock: 8,
  }),
  input: (base) => ({
    ...base,
    color: "var(--foreground)",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--foreground)",
    fontWeight: 500,
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "var(--primary)" : "var(--muted-foreground)",
    ":hover": {
      color: "var(--primary)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    ":hover": {
      color: "var(--destructive)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999, // Ensure it sits on top of everything
    backgroundColor: "#FFFFFF", // Hardcoded white to prevent transparency issues
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
    padding: "4px",
    marginTop: "8px",
  }),
  menuList: (provided) => ({
    ...provided,
    backgroundColor: "#FFFFFF",
    padding: 0,
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    backgroundColor: state.isSelected
      ? "var(--secondary)" // Muted background for selected
      : state.isFocused
        ? "var(--secondary)" // Hover state
        : "transparent",
    color: state.isSelected ? "var(--primary)" : "var(--foreground)",
    fontWeight: state.isSelected ? 600 : 400,
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    opacity: state.isDisabled ? 0.5 : 1,
    padding: "10px 12px",
    ":active": {
      backgroundColor: "var(--secondary)",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
  }),
};

export const Select: React.FC<SelectProps> = React.memo(
  ({
    value,
    options,
    placeholder,
    disabled,
    isLoading,
    isClearable = true,
    onChange,
    onBlur,
    className = "",
    isCreatable,
    formatCreateLabel,
    onCreateOption,
  }) => {
    const selectValue = React.useMemo(() => {
      if (!value) return null;
      const existing = options.find((option) => option.value === value);
      if (existing) return existing;
      return { value, label: value, isDisabled: false };
    }, [value, options]);

    const handleChange = (
      option: SingleValue<SelectOption>,
      action: ActionMeta<SelectOption>,
    ) => {
      onChange(option?.value ?? null, action);
    };

    const sharedProps: Partial<ReactSelectProps<SelectOption, false>> = {
      className,
      classNamePrefix: "app-select",
      value: selectValue,
      options,
      onChange: handleChange,
      placeholder,
      isDisabled: disabled,
      isLoading,
      onBlur,
      isClearable,
      styles: selectStyles,
    };

    if (isCreatable) {
      return (
        <CreatableSelect<SelectOption, false>
          {...sharedProps}
          onCreateOption={onCreateOption}
          formatCreateLabel={formatCreateLabel}
        />
      );
    }

    return <SelectComponent<SelectOption, false> {...sharedProps} />;
  },
);

Select.displayName = "Select";
