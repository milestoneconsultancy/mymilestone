import { Shell } from "@/components/layout/Shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TrackerHomePage() {
  return (
    <Shell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[#0A2E5A]">Interview tracker</h1>
        <p className="text-sm text-gray-500">Pipeline and candidate operations</p>
        <div className="flex gap-3">
          <Link href="/tracker/new"><Button variant="accent">New interview</Button></Link>
          <Link href="/tracker/candidates"><Button variant="outline">Candidates</Button></Link>
        </div>
      </div>
    </Shell>
  );
}
