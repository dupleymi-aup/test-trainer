import { LoadingSpinner } from "@/components/loading";

export function SubpageLoading({ pageName }: { pageName: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" text={`Loading: ${pageName}...`} />
    </div>
  );
}
