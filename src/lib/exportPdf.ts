import { jsPDF } from 'jspdf';
import type { BriefingData } from '@/store';
import type { SessionDetail } from '@/lib/api';

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 6;

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  return y + LINE_HEIGHT + 2;
}

function addParagraph(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * LINE_HEIGHT + 4;
}

function addLabelValue(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(label, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(value, CONTENT_WIDTH - 40);
  doc.text(lines, MARGIN + 40, y);
  return y + Math.max(LINE_HEIGHT, lines.length * LINE_HEIGHT) + 2;
}

function addBulletList(doc: jsPDF, items: string[], y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let currentY = y;
  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH - 5);
    doc.text(lines, MARGIN + 5, currentY);
    currentY += lines.length * LINE_HEIGHT + 2;
  }
  return currentY + 4;
}

function formatSessionDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function checkNewPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 277) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

export async function exportProjectToPdf(params: {
  projectLabel: string;
  briefing: BriefingData | null;
  sessions: SessionDetail[];
}): Promise<void> {
  const { projectLabel, briefing, sessions } = params;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.setProperties({
    title: `Sales Sparring - ${projectLabel}`,
    subject: 'Project export with sessions',
  });

  let y = MARGIN;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(projectLabel, MARGIN, y);
  y += LINE_HEIGHT * 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exported on ${new Date().toLocaleString()}`, MARGIN, y);
  y += LINE_HEIGHT * 2 + 4;

  // Client profile
  if (briefing) {
    y = addSectionTitle(doc, 'Client Profile', y);
    y = checkNewPage(doc, y, 60);
    const cp = briefing.clientProfile;
    y = addLabelValue(doc, 'Company:', cp.name, y);
    y = addLabelValue(doc, 'Size:', cp.size, y);
    y = addLabelValue(doc, 'Budget:', cp.budgetCycle, y);
    y = addLabelValue(doc, 'Timeline:', cp.decisionTimeline, y);
    y = addLabelValue(doc, 'Persona:', cp.buyerPersona, y);
    y += 6;

    if (briefing.valueProposition) {
      y = addSectionTitle(doc, 'Value Proposition', y);
      y = checkNewPage(doc, y, 20);
      y = addParagraph(doc, briefing.valueProposition, y);
      y += 4;
    }

    if (briefing.buyingConstraints?.length) {
      y = addSectionTitle(doc, 'Buying Constraints', y);
      y = checkNewPage(doc, y, briefing.buyingConstraints.length * 15);
      y = addBulletList(doc, briefing.buyingConstraints, y);
    }

    if (briefing.objections?.length) {
      y = addSectionTitle(doc, 'Objections', y);
      y = checkNewPage(doc, y, briefing.objections.length * 20);
      for (const o of briefing.objections) {
        doc.setFont('helvetica', 'bold');
        doc.text(o.title, MARGIN, y);
        y += LINE_HEIGHT;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(o.detail || '', CONTENT_WIDTH);
        doc.text(lines, MARGIN, y);
        y += lines.length * LINE_HEIGHT + 4;
      }
      y += 4;
    }

    if (briefing.clientResearch?.summary) {
      y = addSectionTitle(doc, 'Client Research', y);
      y = checkNewPage(doc, y, 30);
      y = addParagraph(doc, briefing.clientResearch.summary, y);
    }
  } else {
    y = addParagraph(doc, 'No briefing data available for this project.', y);
  }

  // Sessions
  y = addSectionTitle(doc, `Sessions (${sessions.length})`, y + 8);
  y = checkNewPage(doc, y, 30);

  const sortedSessions = [...sessions].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  for (let i = 0; i < sortedSessions.length; i++) {
    const s = sortedSessions[i];
    y = checkNewPage(doc, y, 40);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Session ${i + 1} — ${formatSessionDate(s.created_at)}`, MARGIN, y);
    y += LINE_HEIGHT + 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const scoreStr =
      s.overall_score != null
        ? `Score: ${s.overall_score} | Objection handling: ${s.objection_handling ?? '—'} | Clarity: ${s.communication_clarity ?? '—'}`
        : 'Not evaluated';
    doc.text(scoreStr, MARGIN, y);
    y += LINE_HEIGHT + 2;

    if (s.strengths?.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('Strengths:', MARGIN, y);
      y += LINE_HEIGHT;
      doc.setFont('helvetica', 'normal');
      y = addBulletList(doc, s.strengths, y);
    }
    if (s.weaknesses?.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('Areas to improve:', MARGIN, y);
      y += LINE_HEIGHT;
      doc.setFont('helvetica', 'normal');
      y = addBulletList(doc, s.weaknesses, y);
    }

    if (s.transcript?.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('Transcript:', MARGIN, y);
      y += LINE_HEIGHT + 2;
      doc.setFont('helvetica', 'normal');

      for (const msg of s.transcript) {
        y = checkNewPage(doc, y, 15);
        const role = msg.role === 'buyer' ? 'Buyer' : 'You';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${role}:`, MARGIN, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(msg.content, CONTENT_WIDTH - 5);
        doc.text(lines, MARGIN + 5, y + LINE_HEIGHT);
        y += LINE_HEIGHT + lines.length * LINE_HEIGHT + 4;
      }
    }
    y += 8;
  }

  const safeName = projectLabel.replace(/[^a-z0-9-_]/gi, '_').slice(0, 50);
  doc.save(`sales-sparring-${safeName}.pdf`);
}
