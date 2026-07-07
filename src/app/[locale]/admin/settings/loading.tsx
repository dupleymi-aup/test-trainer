import { LoadingSpinner } from "@/components/loading";

export default function Loading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="md" text="Загрузка..." />
    </div>
  );
}