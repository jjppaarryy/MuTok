type ActionButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
};

export default function ActionButton({
  label,
  variant = "primary",
  onClick,
  disabled,
  type = "button",
  title
}: ActionButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    padding: '16px 32px',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease'
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#fe2c55',
      color: 'white',
      boxShadow: '0 8px 24px rgba(254, 44, 85, 0.35)'
    },
    secondary: {
      backgroundColor: '#0f172a',
      color: 'white',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#334155',
      boxShadow: 'none'
    },
    outline: {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      border: '1px solid #e2e8f0',
      boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)'
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant] }}
      onClick={onClick}
      disabled={disabled}
      type={type}
      title={title}
    >
      {label}
    </button>
  );
}
