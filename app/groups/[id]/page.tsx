import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GroupView } from "@/components/group-view";

// With Cache Components, runtime params must be read inside a Suspense boundary.
export default function GroupPage({ params }: PageProps<"/groups/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
      {params.then(({ id }) => {
        const groupId = Number(id);
        if (!Number.isSafeInteger(groupId) || groupId <= 0) notFound();
        return <GroupView groupId={groupId} />;
      })}
    </Suspense>
  );
}
