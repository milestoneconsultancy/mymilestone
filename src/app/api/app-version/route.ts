import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: release, error } = await supabase
      .from("app_releases")
      .select("*")
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        version: "1.0.0",
        title: "Milestone ERP",
        notes: "Production release",
        minSupportedVersion: "1.0.0",
      });
    }

    return NextResponse.json({
      version: release?.version || "1.0.0",
      title: release?.title || "Milestone ERP",
      notes: release?.notes || "Production release",
      releasedAt: release?.released_at || new Date().toISOString(),
      minSupportedVersion: "1.0.0",
    });
  } catch (err: any) {
    return NextResponse.json({
      version: "1.0.0",
      title: "Milestone ERP",
      notes: "Production release",
      minSupportedVersion: "1.0.0",
    });
  }
}
