import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // If unauthenticated, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.redirect(new URL("/tracker", request.url));
    }

    const formData = await request.formData();
    const file = (formData.get("file") || formData.get("resume") || formData.get("media")) as File | null;

    if (!file) {
      return NextResponse.redirect(new URL("/tracker/new", request.url));
    }

    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${profile.company_id}/incoming/${fileName}`;

    const admin = createServiceRoleClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Share target upload error:", uploadError);
      return NextResponse.redirect(new URL("/tracker/new", request.url));
    }

    // Redirect to New Interview page with incoming path parameter
    const redirectUrl = new URL("/tracker/new", request.url);
    redirectUrl.searchParams.set("incoming", storagePath);
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error("Share endpoint error:", err);
    return NextResponse.redirect(new URL("/tracker/new", request.url));
  }
}
