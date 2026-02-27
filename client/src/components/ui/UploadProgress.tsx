interface UploadProgressProps {
  percent: number;
}

export const UploadProgress = ({ percent }: UploadProgressProps) => (
  <div className="w-full bg-stone-200 rounded-full h-2 mt-2">
    <div
      className="bg-teal-500 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
);
