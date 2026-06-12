import Header from "@/components/Header";
import { TaskBoardSkeleton } from "@/components/ui/Skeleton";

export default function TaskTrackingLoading() {
  return (
    <main className="min-h-[calc(100dvh-112px)] overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="motion-content-enter flex min-h-0 flex-col p-6 pt-0">
        <Header
          title="Task Tracking"
          subtitle="Track and manage tasks, assignments, and progress."
        />

        <div className="mt-6 flex flex-col gap-4">
          <TaskBoardSkeleton includeHeader={false} />
        </div>
      </div>
    </main>
  );
}
