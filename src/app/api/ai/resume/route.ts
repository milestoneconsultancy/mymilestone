import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { callGeminiWithFallback } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, regexFields } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = `
You are an expert HR recruiter and resume parser.
Extract the candidate details from the following resume text.

RESUME TEXT:
"""
${text.slice(0, 15000)}
"""

KNOWN PRE-EXTRACTED REGEX HINTS:
- Mobile: ${regexFields?.mobile_no || "unknown"}
- Email: ${regexFields?.email || "unknown"}
- Pincode: ${regexFields?.pincode || "unknown"}
- Date of Birth: ${regexFields?.date_of_birth || "unknown"}

Extract and return a strict JSON object with EXACTLY these field names:
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

Only return the JSON object. Do not include markdown ticks or additional commentary.
`;

    try {
      const responseText = await callGeminiWithFallback(
        prompt,
        "You are an expert resume parsing engine. Always return strict, valid JSON with exact field names."
      );

      let parsed: any = {};
      try {
        const clean = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch (parseErr) {
        console.error("JSON parse error from Gemini output:", responseText);
        throw parseErr;
      }

      // Validation against raw text
      // If mobile, email, or pincode extracted by AI doesn't match raw text, fall back to regex
      let validatedMobile = parsed.mobile_no ? String(parsed.mobile_no).replace(/\D/g, "").slice(-10) : "";
      if (!validatedMobile || (validatedMobile.length === 10 && !text.includes(validatedMobile))) {
        if (regexFields?.mobile_no) validatedMobile = regexFields.mobile_no;
      }

      let validatedEmail = parsed.email || "";
      if (!validatedEmail || !text.toLowerCase().includes(validatedEmail.toLowerCase())) {
        if (regexFields?.email) validatedEmail = regexFields.email;
      }

      let validatedPincode = parsed.pincode || "";
      if (!validatedPincode || !text.includes(validatedPincode)) {
        if (regexFields?.pincode) validatedPincode = regexFields.pincode;
      }

      // Compute age if DOB exists
      let age = parsed.age || null;
      const dob = parsed.date_of_birth || regexFields?.date_of_birth || null;
      if (dob && !age) {
        const birthDate = new Date(dob);
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
          date_of_birth: dob,
          age: age,
          mobile_no: validatedMobile || null,
          email: validatedEmail || null,
          address: parsed.address || null,
          pincode: validatedPincode || null,
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
      console.error("[/api/ai/resume error]:", aiErr?.message || aiErr);
      return NextResponse.json({
        aiOk: false,
        error: "AI busy — basic details filled",
        aiError: aiErr?.message || "AI model failure",
        data: {
          candidate_name: null,
          gender: null,
          date_of_birth: regexFields?.date_of_birth || null,
          age: regexFields?.age || null,
          mobile_no: regexFields?.mobile_no || null,
          email: regexFields?.email || null,
          address: null,
          pincode: regexFields?.pincode || null,
          position_applied_for: null,
          education: null,
          total_experience_years: null,
          current_location: null,
          current_salary: null,
          expected_salary: null,
          joining_availability: null,
          remarks: null,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
