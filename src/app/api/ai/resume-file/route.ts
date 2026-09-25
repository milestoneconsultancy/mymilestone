import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { callGeminiMultimodal } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/pdf";

    const prompt = `
You are an expert HR recruiter and OCR resume parser.
Examine this resume document image or scanned PDF and extract the candidate's details.

Return a strict JSON object with EXACTLY these field names:
{
  "candidate_name": "<full candidate name>",
  "gender": "<Male | Female | Other or null>",
  "date_of_birth": "<YYYY-MM-DD or null>",
  "age": <number or null>,
  "mobile_no": "<10-digit number only or null>",
  "email": "<valid email or null>",
  "address": "<residential address or city/state or null>",
  "pincode": "<6-digit Indian pincode or null>",
  "position_applied_for": "<job title / position or null>",
  "education": "<highest degree or qualification or null>",
  "total_experience_years": <number with up to 1 decimal place, e.g. 3.5, or 0 if fresher>,
  "current_location": "<current city/town or null>",
  "current_salary": "<e.g. 3.5 LPA or 25,000/month or null>",
  "expected_salary": "<e.g. 4.5 LPA or null>",
  "joining_availability": "<e.g. Immediate, 15 days, 1 month or null>",
  "remarks": "<concise summary of skills/key projects or null>"
}

Only return the JSON object. Do not include markdown ticks.
`;

    try {
      const responseText = await callGeminiMultimodal(prompt, buffer, mimeType);
      const clean = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);

      let mobile = parsed.mobile_no ? String(parsed.mobile_no).replace(/\D/g, "").slice(-10) : null;
      let age = parsed.age || null;
      if (parsed.date_of_birth && !age) {
        const birthDate = new Date(parsed.date_of_birth);
        if (!isNaN(birthDate.getTime())) {
          const diff = Date.now() - birthDate.getTime();
          age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        }
      }

      return NextResponse.json({
        aiOk: true,
        data: {
          candidate_name: parsed.candidate_name || null,
          gender: parsed.gender || null,
          date_of_birth: parsed.date_of_birth || null,
          age,
          mobile_no: mobile,
          email: parsed.email || null,
          address: parsed.address || null,
          pincode: parsed.pincode || null,
          position_applied_for: parsed.position_applied_for || null,
          education: parsed.education || null,
          total_experience_years: typeof parsed.total_experience_years === "number" ? parsed.total_experience_years : null,
          current_location: parsed.current_location || null,
          current_salary: parsed.current_salary || null,
          expected_salary: parsed.expected_salary || null,
          joining_availability: parsed.joining_availability || null,
          remarks: parsed.remarks || null,
        },
      });
    } catch (aiErr: any) {
      console.error("[/api/ai/resume-file error]:", aiErr?.message || aiErr);
      return NextResponse.json({
        aiOk: false,
        error: "AI busy — please fill details manually",
        aiError: aiErr?.message || "Multimodal AI model failure",
        data: {},
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
