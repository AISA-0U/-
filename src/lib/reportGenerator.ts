import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

export interface ReportData {
  title: string;
  content: string;
  dataPoints?: { label: string; value: number }[];
}

export const generatePDF = (data: ReportData) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(data.title, 20, 20);
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(data.content, 170);
  doc.text(splitText, 20, 40);
  
  if (data.dataPoints) {
    let y = 100;
    doc.text("Data Summary:", 20, y);
    y += 10;
    data.dataPoints.forEach(dp => {
      doc.text(`${dp.label}: ${dp.value}`, 30, y);
      y += 7;
    });
  }
  
  doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
};

export const generateExcel = (data: ReportData) => {
  const wsData = [
    ["Title", data.title],
    ["Content", data.content],
    [],
    ["Label", "Value"]
  ];
  
  if (data.dataPoints) {
    data.dataPoints.forEach(dp => {
      wsData.push([dp.label, dp.value.toString()]);
    });
  }
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${data.title.replace(/\s+/g, '_')}.xlsx`);
};

export const generateWord = async (data: ReportData) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: data.title,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun(data.content),
            ],
          }),
          ...(data.dataPoints ? [
            new Paragraph({ text: "Data Summary", heading: HeadingLevel.HEADING_2 }),
            ...data.dataPoints.map(dp => new Paragraph({ text: `${dp.label}: ${dp.value}` }))
          ] : [])
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.title.replace(/\s+/g, '_')}.docx`);
};
