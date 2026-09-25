import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket") || "resumes";
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Missing file path" }, { status: 400 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "No company associated" }, { status: 403 });
    }

    // Security check: path must belong to user's company folder
    if (!path.startsWith(`${profile.company_id}/`) && !path.startsWith(profile.company_id)) {
      return NextResponse.json({ error: "Forbidden: file outside company space" }, { status: 403 });
    }

    // Use service role to generate 1-hour signed URL safely
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Failed to generate signed URL" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
