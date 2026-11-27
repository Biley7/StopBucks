import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-sky-700 text-white hover:bg-sky-800 focus-visible:ring-sky-600",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
        outline:
          "border border-slate-900/[0.10] bg-white hover:bg-slate-50 hover:border-slate-900/[0.18] text-slate-900 focus-visible:ring-sky-500",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
        ghost:
          "hover:bg-slate-100 text-slate-700 hover:text-slate-900 focus-visible:ring-sky-500",
        link: "text-sky-600 underline-offset-4 hover:underline focus-visible:ring-sky-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base font-semibold",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

