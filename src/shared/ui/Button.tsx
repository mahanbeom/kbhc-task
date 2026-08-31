import type { ComponentPropsWithRef } from 'react';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'danger';
}

const variantClass = {
  primary: 'bg-primary hover:bg-primary-strong',
  danger: 'bg-danger text-background hover:opacity-90',
};

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:bg-disabled disabled:text-background ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
