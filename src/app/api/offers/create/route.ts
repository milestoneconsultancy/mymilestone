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
      candidateId,
      baseRef: incomingBaseRef,
      version: incomingVersion,
      letterDate,
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

    if (!candidateId || !candidateName || !designation || !salary || !joiningDate) {
      return NextResponse.json({ error: "Missing required offer fields" }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const prefix = company.offer_ref_prefix || "MC/OL";
    let baseRef = incomingBaseRef;
    let version = incomingVersion || 1;
    let refNo = "";

    const admin = createServiceRoleClient();

    if (!baseRef) {
      // Generate new sequential base ref for this year: MC/OL/YYYY/NNN
      const counterKey = `offer:${currentYear}`;
      const { data: counterData, error: counterError } = await admin.rpc("next_counter", {
        p_company: company.id,
        p_name: counterKey,
      });

      let seq = 1;
      if (!counterError && typeof counterData === "number") {
        seq = counterData;
      } else {
        // Fallback: count offers in company
        const { count } = await admin
          .from("offers")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);
        seq = (count || 0) + 1;
      }

      baseRef = `${prefix}/${currentYear}/${String(seq).padStart(3, "0")}`;
      refNo = baseRef;
      version = 1;
    } else {
      // Creating a new version for an existing offer (-v2, -v3...)
      const { count } = await admin
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("base_ref", baseRef);

      version = (count || 1) + 1;
      refNo = `${baseRef}-v${version}`;
    }

    // Helper to download letterhead asset from storage
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

    // Build PDF
    const pdfBuffer = await generateOfferLetterPdf({
      companyName: company.name,
      companyAddress: company.address,
      companyLegalName: company.legal_name,
      refNo,
      letterDate: letterDate || new Date().toISOString().split("T")[0],
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
      acceptBy: acceptBy || joiningDate,
      responsibilities,
      facilities,
      letterTexts,
      headerImageBuffer: headerBuffer,
      footerImageBuffer: footerBuffer,
      signImageBuffer: signBuffer,
      stampImageBuffer: stampBuffer,
    });

    // Upload PDF to Supabase Storage bucket 'offers'
    const safeRef = refNo.replace(/\//g, "-");
    const pdfStoragePath = `${company.id}/${safeRef}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("offers")
      .upload(pdfStoragePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload offer PDF:", uploadError);
      throw uploadError;
    }

    // If version > 1, deactivate previous active offer for this base_ref
    if (version > 1) {
      await admin
        .from("offers")
        .update({ is_active: false })
        .eq("company_id", company.id)
        .eq("base_ref", baseRef);
    }

    // Insert offer row
    const { data: newOffer, error: offerError } = await admin
      .from("offers")
      .insert({
        company_id: company.id,
        candidate_id: candidateId,
        base_ref: baseRef,
        version: version,
        ref_no: refNo,
        is_active: true,
        designation,
        salary,
        letter_date: letterDate || new Date().toISOString().split("T")[0],
        joining_date: joiningDate,
        accept_by: acceptBy || joiningDate,
        status: "Issued",
        pdf_path: pdfStoragePath,
        payload: body,
        issued_by: profile.id,
      })
      .select()
      .single();

    if (offerError) throw offerError;

    // Mark candidate Selected + joining date
    await admin
      .from("candidates")
      .update({
        final_status: "Selected",
        joining_date: joiningDate,
      })
      .eq("id", candidateId)
      .eq("company_id", company.id);

    // Insert note in call_logs
    await admin.from("call_logs").insert({
      company_id: company.id,
      candidate_id: candidateId,
      outcome: "Offer discussed",
      note: `Offer letter ${refNo} issued for ${designation} (Salary: ${salary}). Joining scheduled for ${joiningDate}.`,
      logged_by: profile.id,
    });

    // Insert audit log
    await admin.from("audit_log").insert({
      company_id: company.id,
      actor: profile.id,
      action: "OFFER_ISSUED",
      entity: "offers",
      entity_id: newOffer.id,
      details: `Issued offer ${refNo} to candidate ${candidateName}`,
    });

    // Create 24-hour signed URL for immediate download/preview
    const { data: signedData } = await admin.storage
      .from("offers")
      .createSignedUrl(pdfStoragePath, 86400);

    return NextResponse.json({
      success: true,
      offer: newOffer,
      refNo,
      signedUrl: signedData?.signedUrl || null,
    });
  } catch (err: any) {
    console.error("Create offer error:", err);
    return NextResponse.json({ error: err.message || "Failed to create offer" }, { status: 500 });
  }
}
