import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-sm py-1.5 px-2",
  md: "text-base py-2 px-3",
  lg: "text-xl py-2.5 px-4",
};

export default function Logo({ className, size = "md" }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-white font-bold text-red-500 shrink-0",
        sizeClasses[size],
        className
      )}
    >
      NET
    </div>
  );
}
