import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
// Load local environment variables natively
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local or environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// CSV parser supporting quotes, commas inside quotes, and newlines
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // skip \n of \r\n
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Clean and normalize dates to YYYY-MM-DD
function normalizeDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Parse using Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const csvFilePath = args[0] || path.resolve(process.cwd(), "candidates.csv");

  console.log("==========================================");
  console.log("Milestone ERP — Google Sheet Data Importer");
  console.log("==========================================");
  console.log(`Target CSV: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    console.log("Usage: npx tsx scripts/import-from-sheet.ts [path-to-csv]");
    process.exit(1);
  }

  // 1. Identify Target Company
  let companyId = process.env.COMPANY_ID;
  if (!companyId) {
    const { data: companies, error: compErr } = await supabase
      .from("companies")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1);

    if (compErr || !companies || companies.length === 0) {
      console.error("No company found in database. Create or backfill a company first.");
      process.exit(1);
    }
    companyId = companies[0].id;
    console.log(`Using company: ${companies[0].name} (${companyId})`);
  }

  // 2. Read and Parse CSV
  const fileContent = fs.readFileSync(csvFilePath, "utf8");
  const rawRows = parseCSV(fileContent);

  if (rawRows.length === 0) {
    console.log("CSV file is empty.");
    return;
  }

  // Check header
  const header = rawRows[0];
  console.log(`Detected ${rawRows.length - 1} rows to import.`);
  console.log("Columns:", header.join(" | "));

  let successCount = 0;
  let errorCount = 0;

  for (let idx = 1; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    if (row.length < 3) continue; // Skip malformed empty rows

    // 21-column schema
    const rawId = row[0] || "";
    const rawInterviewDate = row[1] || "";
    const candidateName = row[2] || "Unnamed Candidate";
    const gender = row[3] || null;
    const rawDob = row[4] || "";
    const rawAge = row[5] || "";
    const mobileNo = row[6] || "";
    const email = row[7] || null;
    const address = row[8] || null;
    const pincode = row[9] || null;
    const position = row[10] || null;
    const education = row[11] || null;
    const rawExp = row[12] || "";
    const currentLocation = row[13] || null;
    const currentSalary = row[14] || null;
    const expectedSalary = row[15] || null;
    const joiningAvailability = row[16] || null;
    const rawStatus = row[17] || "Pending Call";
    const rawJoiningDate = row[18] || "";
    const resumeLink = row[19] || null;
    const originalRemarks = row[20] || "";

    // Parse integer interview_no if available
    let interviewNo: number | undefined = undefined;
    const numParsed = parseInt(rawId.replace(/\D/g, ""), 10);
    if (!isNaN(numParsed) && numParsed > 0) {
      interviewNo = numParsed;
    }

    // Normalize final status
    let finalStatus = "Pending Call";
    const sLower = rawStatus.toLowerCase();
    if (sLower.includes("select")) finalStatus = "Selected";
    else if (sLower.includes("reject")) finalStatus = "Rejected";
    else if (sLower.includes("hold")) finalStatus = "Hold";
    else if (sLower.includes("pending call")) finalStatus = "Pending Call";
    else if (sLower.includes("pending")) finalStatus = "Pending";

    // Combine remarks with resume link if present
    let finalRemarks = originalRemarks;
    if (resumeLink && resumeLink.trim()) {
      finalRemarks = finalRemarks
        ? `${finalRemarks} | Resume: ${resumeLink.trim()}`
        : `Resume: ${resumeLink.trim()}`;
    }

    const candidatePayload: any = {
      company_id: companyId,
      candidate_name: candidateName.trim(),
      mobile_no: mobileNo.replace(/\D/g, "").slice(-10) || mobileNo.trim(),
      email: email?.trim() || null,
      gender: gender?.trim() || null,
      date_of_birth: normalizeDate(rawDob),
      age: parseInt(rawAge, 10) || null,
      address: address?.trim() || null,
      pincode: pincode?.replace(/\D/g, "") || null,
      position_applied_for: position?.trim() || null,
      education: education?.trim() || null,
      total_experience_years: parseFloat(rawExp) || null,
      current_location: currentLocation?.trim() || null,
      current_salary: currentSalary?.trim() || null,
      expected_salary: expectedSalary?.trim() || null,
      joining_availability: joiningAvailability?.trim() || null,
      final_status: finalStatus,
      joining_date: normalizeDate(rawJoiningDate),
      interview_date: normalizeDate(rawInterviewDate) || new Date().toISOString().split("T")[0],
      resume_path: resumeLink?.startsWith("http") ? resumeLink.trim() : null,
      remarks: finalRemarks || null,
    };

    if (interviewNo) {
      candidatePayload.interview_no = interviewNo;
    } else {
      const { data: nextNum } = await supabase.rpc("next_counter", {
        p_company: companyId,
        p_name: "interview",
      });
      candidatePayload.interview_no = nextNum || idx;
    }

    const { error: insErr } = await supabase.from("candidates").insert(candidatePayload);

    if (insErr) {
      console.error(`Row ${idx} failed (#${interviewNo || idx} ${candidateName}):`, insErr.message);
      errorCount++;
    } else {
      console.log(`Row ${idx} OK: #${interviewNo || "auto"} ${candidateName} (${finalStatus})`);
      successCount++;
    }
  }

  console.log("\n==========================================");
  console.log(`Import Complete!`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Errors / Skipped:     ${errorCount}`);
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Fatal import error:", err);
  process.exit(1);
});
