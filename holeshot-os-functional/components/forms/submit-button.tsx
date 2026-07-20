"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Guardando...",
  className = "btn-primary",
  disabled,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      aria-disabled={pending || disabled}
      className={className}
      disabled={pending || disabled}
      type={type}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
