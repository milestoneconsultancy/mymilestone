import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface OfferPdfOptions {
  companyName: string;
  companyAddress?: string | null;
  companyLegalName?: string | null;
  refNo: string;
  letterDate: string;
  candidateName: string;
  candidateAddress?: string | null;
  candidateMobile?: string | null;
  designation: string;
  reportingTo: string;
  project: string;
  posting: string;
  noticePeriod: string;
  salary: string;
  joiningDate: string;
  acceptBy: string;
  responsibilities: Array<{ title?: string | null; text: string }>;
  facilities: Array<{ label: string; text: string }>;
  letterTexts: {
    subject?: string;
    intro?: string;
    joining?: string;
    conditions?: string;
    general?: string;
    closing?: string;
    acceptance?: string;
  };
  headerImageBuffer?: Buffer | null;
  footerImageBuffer?: Buffer | null;
  signImageBuffer?: Buffer | null;
  stampImageBuffer?: Buffer | null;
}

export async function generateOfferLetterPdf(opts: OfferPdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions: 595.28 x 841.89 points
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  const COLOR_BLUE = rgb(31 / 255, 95 / 255, 168 / 255); // #1F5FA8
  const COLOR_BLACK = rgb(0.1, 0.1, 0.1);
  const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
  const COLOR_LIGHT_BORDER = rgb(0.8, 0.8, 0.8);

  // Embed images safely
  let embeddedHeader: any = null;
  let embeddedFooter: any = null;
  let embeddedSign: any = null;
  let embeddedStamp: any = null;

  try {
    if (opts.headerImageBuffer) {
      embeddedHeader = await pdfDoc.embedPng(opts.headerImageBuffer).catch(() => pdfDoc.embedJpg(opts.headerImageBuffer!));
    }
  } catch (e) {
    console.warn("Could not embed header image", e);
  }

  try {
    if (opts.footerImageBuffer) {
      embeddedFooter = await pdfDoc.embedPng(opts.footerImageBuffer).catch(() => pdfDoc.embedJpg(opts.footerImageBuffer!));
    }
  } catch (e) {
    console.warn("Could not embed footer image", e);
  }

  try {
    if (opts.signImageBuffer) {
      embeddedSign = await pdfDoc.embedPng(opts.signImageBuffer).catch(() => pdfDoc.embedJpg(opts.signImageBuffer!));
    }
  } catch (e) {
    console.warn("Could not embed signature image", e);
  }

  try {
    if (opts.stampImageBuffer) {
      embeddedStamp = await pdfDoc.embedPng(opts.stampImageBuffer).catch(() => pdfDoc.embedJpg(opts.stampImageBuffer!));
    }
  } catch (e) {
    console.warn("Could not embed stamp image", e);
  }

  // Helper for placeholder replacement
  const firstName = opts.candidateName.split(" ")[0];
  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{{NAME}}/g, opts.candidateName)
      .replace(/{{FIRST_NAME}}/g, firstName)
      .replace(/{{DESIGNATION}}/g, opts.designation)
      .replace(/{{COMPANY}}/g, opts.companyName)
      .replace(/{{JOINING_DATE}}/g, opts.joiningDate)
      .replace(/{{ACCEPT_BY}}/g, opts.acceptBy)
      .replace(/{{NOTICE_PERIOD}}/g, opts.noticePeriod)
      .replace(/{{SALARY}}/g, opts.salary)
      .replace(/{{REPORTING_TO}}/g, opts.reportingTo)
      .replace(/{{POSTING}}/g, opts.posting)
      .replace(/{{PROJECT}}/g, opts.project);
  };

  // Helper to split text into wrapped lines
  const wrapText = (text: string, maxWidth: number, font: any, fontSize: number): string[] => {
    const paragraphs = text.split("\n");
    const lines: string[] = [];

    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) {
        lines.push("");
        return;
      }
      const words = paragraph.split(" ");
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
    });

    return lines;
  };

  // ==========================================
  // PAGE 1: Header, Ref/Date, To, Subject, Intro, Position & Reporting, Responsibilities
  // ==========================================
  const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y1 = PAGE_HEIGHT - 30;

  // Header image or fallback text
  if (embeddedHeader) {
    const headerHeight = 65;
    page1.drawImage(embeddedHeader, {
      x: MARGIN,
      y: y1 - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
    });
    y1 -= headerHeight + 15;
  } else {
    page1.drawText(opts.companyName.toUpperCase(), {
      x: MARGIN,
      y: y1 - 15,
      size: 16,
      font: timesBold,
      color: COLOR_BLUE,
    });
    if (opts.companyAddress) {
      page1.drawText(opts.companyAddress, {
        x: MARGIN,
        y: y1 - 30,
        size: 9,
        font: timesRoman,
        color: COLOR_GRAY,
      });
      y1 -= 40;
    } else {
      y1 -= 25;
    }
  }

  // OFFER LETTER Heading
  page1.drawText("OFFER LETTER", {
    x: PAGE_WIDTH / 2 - 50,
    y: y1,
    size: 13,
    font: timesBold,
    color: COLOR_BLUE,
  });
  y1 -= 20;

  // Ref No & Date
  page1.drawText(`Ref: ${opts.refNo}`, {
    x: MARGIN,
    y: y1,
    size: 10,
    font: timesBold,
    color: COLOR_BLACK,
  });
  const dateStr = `Date: ${opts.letterDate}`;
  const dateWidth = timesRoman.widthOfTextAtSize(dateStr, 10);
  page1.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN - dateWidth,
    y: y1,
    size: 10,
    font: timesRoman,
    color: COLOR_BLACK,
  });
  y1 -= 20;

  // Candidate Address
  page1.drawText("To,", { x: MARGIN, y: y1, size: 10, font: timesBold, color: COLOR_BLACK });
  y1 -= 14;
  page1.drawText(opts.candidateName, { x: MARGIN, y: y1, size: 10, font: timesBold, color: COLOR_BLACK });
  y1 -= 13;
  if (opts.candidateAddress) {
    const addrLines = wrapText(opts.candidateAddress, 300, timesRoman, 9.5).slice(0, 2);
    addrLines.forEach((al) => {
      page1.drawText(al, { x: MARGIN, y: y1, size: 9.5, font: timesRoman, color: COLOR_BLACK });
      y1 -= 12;
    });
  }
  if (opts.candidateMobile) {
    page1.drawText(`Mobile: ${opts.candidateMobile}`, { x: MARGIN, y: y1, size: 9.5, font: timesRoman, color: COLOR_BLACK });
    y1 -= 14;
  }
  y1 -= 4;

  // Subject line
  const subjectLine = replacePlaceholders(opts.letterTexts.subject || "Subject: Offer of Appointment – {{DESIGNATION}}");
  page1.drawText(subjectLine, { x: MARGIN, y: y1, size: 10.5, font: timesBold, color: COLOR_BLACK });
  y1 -= 18;

  // Opening paragraph
  const introText = replacePlaceholders(
    opts.letterTexts.intro ||
      "We are pleased to offer you the position of {{DESIGNATION}} with {{COMPANY}}, as discussed during your interview. Based on your qualifications, experience and suitability for the assigned project requirements, we are confident that you will contribute effectively to the project team."
  );
  const introLines = wrapText(introText, CONTENT_WIDTH, timesRoman, 10);
  introLines.forEach((il) => {
    page1.drawText(il, { x: MARGIN, y: y1, size: 10, font: timesRoman, color: COLOR_BLACK });
    y1 -= 13;
  });
  y1 -= 8;

  // Section 1: Position & Reporting (2-column table)
  page1.drawText("1. Position & Reporting", { x: MARGIN, y: y1, size: 11, font: timesBold, color: COLOR_BLUE });
  y1 -= 16;

  const posItems = [
    { label: "Position / Designation:", val: opts.designation },
    { label: "Reporting To:", val: opts.reportingTo },
    { label: "Assigned Project:", val: opts.project },
    { label: "Place of Posting:", val: opts.posting },
  ];

  posItems.forEach((pi) => {
    page1.drawText(pi.label, { x: MARGIN + 10, y: y1, size: 9.5, font: timesBold, color: COLOR_BLACK });
    page1.drawText(pi.val, { x: MARGIN + 160, y: y1, size: 9.5, font: timesRoman, color: COLOR_BLACK });
    y1 -= 14;
  });
  y1 -= 8;

  // Section 2: Key Responsibilities
  page1.drawText("2. Key Responsibilities", { x: MARGIN, y: y1, size: 11, font: timesBold, color: COLOR_BLUE });
  y1 -= 15;

  opts.responsibilities.slice(0, 5).forEach((r) => {
    const titlePart = r.title ? `${r.title}: ` : "";
    const fullResp = `${titlePart}${r.text}`;
    const wrappedResp = wrapText(fullResp, CONTENT_WIDTH - 20, timesRoman, 9.5);

    // Bullet
    page1.drawText("•", { x: MARGIN + 8, y: y1, size: 10, font: timesBold, color: COLOR_BLUE });

    wrappedResp.forEach((rl, idx) => {
      if (idx === 0 && r.title) {
        // Draw title bold and rest roman
        page1.drawText(titlePart, { x: MARGIN + 20, y: y1, size: 9.5, font: timesBold, color: COLOR_BLACK });
        const titleW = timesBold.widthOfTextAtSize(titlePart, 9.5);
        page1.drawText(rl.replace(titlePart, ""), { x: MARGIN + 20 + titleW, y: y1, size: 9.5, font: timesRoman, color: COLOR_BLACK });
      } else {
        page1.drawText(rl, { x: MARGIN + 20, y: y1, size: 9.5, font: timesRoman, color: COLOR_BLACK });
      }
      y1 -= 12.5;
    });
    y1 -= 3;
  });

  // Footer image on Page 1
  if (embeddedFooter) {
    const footerHeight = 45;
    page1.drawImage(embeddedFooter, {
      x: MARGIN,
      y: 15,
      width: CONTENT_WIDTH,
      height: footerHeight,
    });
  }

  // ==========================================
  // PAGE 2: Header, Salary & Facilities table, Joining & Acceptance, Conditions, General, Closing, Signatures
  // ==========================================
  const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y2 = PAGE_HEIGHT - 30;

  // Header image on Page 2
  if (embeddedHeader) {
    const headerHeight = 60;
    page2.drawImage(embeddedHeader, {
      x: MARGIN,
      y: y2 - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
    });
    y2 -= headerHeight + 15;
  } else {
    y2 -= 20;
  }

  // Section 3: Salary & Facilities (Bordered Table)
  page2.drawText("3. Salary & Facilities", { x: MARGIN, y: y2, size: 11, font: timesBold, color: COLOR_BLUE });
  y2 -= 16;

  // Table Header
  const tableX = MARGIN;
  const col1W = 160;
  const col2W = CONTENT_WIDTH - col1W;
  const rowH = 18;

  page2.drawRectangle({
    x: tableX,
    y: y2 - rowH + 4,
    width: CONTENT_WIDTH,
    height: rowH,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: COLOR_LIGHT_BORDER,
    borderWidth: 0.5,
  });

  page2.drawText("Particular", { x: tableX + 8, y: y2 - 9, size: 9.5, font: timesBold, color: COLOR_BLACK });
  page2.drawText("Terms & Conditions", { x: tableX + col1W + 8, y: y2 - 9, size: 9.5, font: timesBold, color: COLOR_BLACK });
  y2 -= rowH;

  // Salary row
  page2.drawRectangle({
    x: tableX,
    y: y2 - rowH + 4,
    width: CONTENT_WIDTH,
    height: rowH,
    borderColor: COLOR_LIGHT_BORDER,
    borderWidth: 0.5,
  });
  page2.drawText("Monthly Gross Salary:", { x: tableX + 8, y: y2 - 9, size: 9.5, font: timesBold, color: COLOR_BLACK });
  page2.drawText(`${opts.salary} per month`, { x: tableX + col1W + 8, y: y2 - 9, size: 9.5, font: timesBold, color: COLOR_BLACK });
  y2 -= rowH;

  // Facilities rows
  opts.facilities.forEach((f) => {
    const fLines = wrapText(f.text, col2W - 16, timesRoman, 8.5);
    const actualRowH = Math.max(rowH, fLines.length * 11 + 6);

    page2.drawRectangle({
      x: tableX,
      y: y2 - actualRowH + 4,
      width: CONTENT_WIDTH,
      height: actualRowH,
      borderColor: COLOR_LIGHT_BORDER,
      borderWidth: 0.5,
    });

    page2.drawText(f.label, { x: tableX + 8, y: y2 - 10, size: 9, font: timesBold, color: COLOR_BLACK });

    fLines.forEach((fl, idx) => {
      page2.drawText(fl, { x: tableX + col1W + 8, y: y2 - 10 - idx * 11, size: 8.5, font: timesRoman, color: COLOR_BLACK });
    });

    y2 -= actualRowH;
  });

  y2 -= 12;

  // Section 4: Joining Date & Acceptance
  const joiningText = replacePlaceholders(
    opts.letterTexts.joining ||
      "Your date of joining shall be {{JOINING_DATE}}. You are required to report for duty on or before {{JOINING_DATE}}. To confirm your acceptance, please sign and return one copy of this letter on or before {{ACCEPT_BY}}."
  );
  page2.drawText("4. Joining Date & Acceptance", { x: MARGIN, y: y2, size: 10.5, font: timesBold, color: COLOR_BLUE });
  y2 -= 13;
  wrapText(joiningText, CONTENT_WIDTH, timesRoman, 9).forEach((jl) => {
    page2.drawText(jl, { x: MARGIN, y: y2, size: 9, font: timesRoman, color: COLOR_BLACK });
    y2 -= 11.5;
  });
  y2 -= 8;

  // Section 5: Employment Conditions
  const condText = replacePlaceholders(
    opts.letterTexts.conditions ||
      "Your appointment shall be subject to verification of documents and compliance with Company policies. A {{NOTICE_PERIOD}} notice period shall apply for resignation."
  );
  page2.drawText("5. Employment Conditions", { x: MARGIN, y: y2, size: 10.5, font: timesBold, color: COLOR_BLUE });
  y2 -= 13;
  wrapText(condText, CONTENT_WIDTH, timesRoman, 9).forEach((cl) => {
    page2.drawText(cl, { x: MARGIN, y: y2, size: 9, font: timesRoman, color: COLOR_BLACK });
    y2 -= 11.5;
  });
  y2 -= 8;

  // Section 6: General
  const genText = replacePlaceholders(
    opts.letterTexts.general ||
      "You are expected to maintain professional conduct, confidentiality of project records, and comply with all applicable safety and administrative requirements."
  );
  page2.drawText("6. General", { x: MARGIN, y: y2, size: 10.5, font: timesBold, color: COLOR_BLUE });
  y2 -= 13;
  wrapText(genText, CONTENT_WIDTH, timesRoman, 9).forEach((gl) => {
    page2.drawText(gl, { x: MARGIN, y: y2, size: 9, font: timesRoman, color: COLOR_BLACK });
    y2 -= 11.5;
  });
  y2 -= 8;

  // Closing
  const closingText = replacePlaceholders(
    opts.letterTexts.closing || "We look forward to welcoming you to {{COMPANY}} and wish you a successful association with the Company."
  );
  wrapText(closingText, CONTENT_WIDTH, timesRoman, 9).forEach((cl) => {
    page2.drawText(cl, { x: MARGIN, y: y2, size: 9, font: timesRoman, color: COLOR_BLACK });
    y2 -= 11.5;
  });
  y2 -= 6;

  // Company Signoff & Signature
  page2.drawText(`Sincerely, For ${opts.companyName}`, {
    x: MARGIN,
    y: y2,
    size: 9.5,
    font: timesBold,
    color: COLOR_BLACK,
  });
  y2 -= 8;

  if (embeddedSign) {
    const signW = 100;
    const signH = 35;
    page2.drawImage(embeddedSign, {
      x: MARGIN,
      y: y2 - signH,
      width: signW,
      height: signH,
    });
    if (embeddedStamp) {
      page2.drawImage(embeddedStamp, {
        x: MARGIN + signW + 10,
        y: y2 - signH - 5,
        width: 45,
        height: 45,
      });
    }
    y2 -= signH + 6;
  } else {
    y2 -= 25;
  }

  page2.drawText("Authorised Signatory", {
    x: MARGIN,
    y: y2,
    size: 9,
    font: timesBold,
    color: COLOR_BLACK,
  });
  y2 -= 16;

  // Acceptance Box
  page2.drawRectangle({
    x: MARGIN,
    y: y2 - 35,
    width: CONTENT_WIDTH,
    height: 45,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: COLOR_LIGHT_BORDER,
    borderWidth: 0.5,
  });

  const acceptText = replacePlaceholders(
    opts.letterTexts.acceptance || "I, {{NAME}}, hereby accept the above offer and agree to join {{COMPANY}} on {{JOINING_DATE}}."
  );
  page2.drawText(acceptText, {
    x: MARGIN + 8,
    y: y2 - 6,
    size: 8.5,
    font: timesRoman,
    color: COLOR_BLACK,
  });

  page2.drawText("Employee Signature: _______________________      Date: _______________", {
    x: MARGIN + 8,
    y: y2 - 24,
    size: 8.5,
    font: timesBold,
    color: COLOR_BLACK,
  });

  // Footer image on Page 2
  if (embeddedFooter) {
    const footerHeight = 45;
    page2.drawImage(embeddedFooter, {
      x: MARGIN,
      y: 15,
      width: CONTENT_WIDTH,
      height: footerHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
