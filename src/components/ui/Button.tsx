import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "primary" | "subtle" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "default" | "small";
  children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  default: "",
  primary: "btn-primary",
  subtle: "btn-subtle",
  danger: "btn-danger",
};

export function Button({
  variant = "default",
  size = "default",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "btn",
        VARIANT_CLASS[variant],
        size === "small" && "btn-sm",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
