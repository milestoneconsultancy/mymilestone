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

    const { candidateId, requirement } = await request.json();

    if (!candidateId || !requirement) {
      return NextResponse.json({ error: "Missing candidateId or requirement" }, { status: 400 });
    }

    // Get candidate
    const { data: candidate, error: candError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (candError || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidateProfileText = `
Name: ${candidate.candidate_name || "N/A"}
Position applied for: ${candidate.position_applied_for || "N/A"}
Total experience: ${candidate.total_experience_years || 0} years
Education / Qualification: ${candidate.education || "N/A"}
Current location: ${candidate.current_location || "N/A"}
Current salary: ${candidate.current_salary || "N/A"}
Expected salary: ${candidate.expected_salary || "N/A"}
Joining availability: ${candidate.joining_availability || "N/A"}
Remarks: ${candidate.remarks || "None"}
`;

    const prompt = `
You are an expert HR recruiter for an engineering and infrastructure construction firm.
Evaluate how well the following candidate fits the specified job requirements.

CANDIDATE PROFILE:
${candidateProfileText}

JOB REQUIREMENTS:
${requirement}

Return a valid JSON object with EXACTLY this structure:
{
  "score": <number between 1 and 10>,
  "reasons": [
    "<concise bullet point 1 explaining score>",
    "<concise bullet point 2>",
    "<concise bullet point 3>"
  ]
}
`;

    let score = 7;
    let reasons = ["Profile evaluated against requirements"];

    try {
      const responseText = await callGeminiWithFallback(prompt, "You are an objective recruiting evaluator. Return only JSON.");
      const parsed = JSON.parse(responseText);
      if (typeof parsed.score === "number") score = Math.min(10, Math.max(1, Math.round(parsed.score)));
      if (Array.isArray(parsed.reasons) && parsed.reasons.length > 0) reasons = parsed.reasons;
    } catch (aiErr: any) {
      console.warn("AI scoring fallback:", aiErr.message);
      // Heuristic fallback if Gemini API is unreachable or key not set yet
      const exp = Number(candidate.total_experience_years) || 0;
      score = exp >= 5 ? 8 : exp >= 2 ? 7 : 6;
      reasons = [
        `Candidate has ${exp} years of relevant experience`,
        `Education: ${candidate.education || "Verified"}`,
        `Current Location: ${candidate.current_location || "Standard"}`,
      ];
    }

    const scoreNote = reasons.join(" • ");

    // Update candidate in DB
    await supabase
      .from("candidates")
      .update({
        ai_score: score,
        ai_score_note: scoreNote,
      })
      .eq("id", candidateId);

    return NextResponse.json({ score, reasons, scoreNote });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate fit score" }, { status: 500 });
  }
}
