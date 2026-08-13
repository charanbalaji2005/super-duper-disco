interface ProgressBarProps {
  label: string;
  progress: number; 
}

export default function ProgressBar({ label, progress }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm text-neutral-500">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
