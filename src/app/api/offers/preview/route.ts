import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { generateOfferLetterPdf } from "@/lib/pdf-generator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, company:companies(*)")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id || !profile.company) {
      return NextResponse.json({ error: "No company associated" }, { status: 403 });
    }

    const company = profile.company as any;
    const body = await request.json();

    const {
      candidateName,
      candidateAddress,
      candidateMobile,
      designation,
      reportingTo,
      project,
      posting,
      noticePeriod,
      salary,
      joiningDate,
      acceptBy,
      responsibilities = [],
      facilities = [],
      letterTexts = {},
    } = body;

    const currentYear = new Date().getFullYear();
    const prefix = company.offer_ref_prefix || "MC/OL";
    const refNo = `${prefix}/${currentYear}/PREVIEW`;

    const admin = createServiceRoleClient();

    const fetchLetterheadBuffer = async (path?: string | null): Promise<Buffer | null> => {
      if (!path) return null;
      try {
        const { data, error } = await admin.storage.from("letterhead").download(path);
        if (error || !data) return null;
        const ab = await data.arrayBuffer();
        return Buffer.from(ab);
      } catch (e) {
        return null;
      }
    };

    const lh = company.letterhead || {};
    const [headerBuffer, footerBuffer, signBuffer, stampBuffer] = await Promise.all([
      fetchLetterheadBuffer(lh.header),
      fetchLetterheadBuffer(lh.footer),
      fetchLetterheadBuffer(lh.sign),
      fetchLetterheadBuffer(lh.stamp),
    ]);

    const pdfBuffer = await generateOfferLetterPdf({
      companyName: company.name,
      companyAddress: company.address,
      companyLegalName: company.legal_name,
      refNo,
      letterDate: new Date().toISOString().split("T")[0],
      candidateName: candidateName || "Candidate Name",
      candidateAddress,
      candidateMobile,
      designation: designation || "Engineer",
      reportingTo: reportingTo || "Project Manager",
      project: project || "Site Project",
      posting: posting || "Project Site",
      noticePeriod: noticePeriod || "one (1) month",
      salary: salary || "₹35,000/-",
      joiningDate: joiningDate || "Agreed Date",
      acceptBy: acceptBy || joiningDate || "Agreed Date",
      responsibilities,
      facilities,
      letterTexts,
      headerImageBuffer: headerBuffer,
      footerImageBuffer: footerBuffer,
      signImageBuffer: signBuffer,
      stampImageBuffer: stampBuffer,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=preview.pdf",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate preview" }, { status: 500 });
  }
}
