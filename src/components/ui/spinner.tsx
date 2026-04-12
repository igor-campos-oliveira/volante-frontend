import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  size?: number;
};

export function Spinner({ className, size = 18 }: SpinnerProps) {
  return <Loader2Icon size={size} className={cn("animate-spin", className)} />;
}

