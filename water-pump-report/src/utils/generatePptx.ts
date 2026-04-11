import pptxgen from "pptxgenjs";
import { reportSlides } from "@/data/report-content";

export const generatePptx = async () => {
  const pres = new pptxgen();

  pres.author = "Hardik Vyas";
  pres.company = "FieldMarshal Pumps";

  reportSlides.forEach((slideData, idx) => {
    const slide = pres.addSlide();

    // Add clean white background
    slide.background = { color: "FFFFFF" };

    // Set dynamic start Y
    let currentY = 0.5;

    // Title 
    slide.addText(slideData.title, {
      x: 0.5,
      y: currentY,
      w: "90%",
      fontSize: idx === 0 ? 36 : 24, // Bigger on first slide
      bold: true,
      color: "0F3D6C",
    });

    currentY += 1.0;

    // Subtitle
    if (slideData.subtitle) {
      slide.addText(slideData.subtitle, {
        x: 0.5,
        y: currentY,
        w: "90%",
        fontSize: 18,
        color: "2ecc71",
        bold: idx === 0, // "adjust this line in bold" from prompt
      });
      currentY += 0.8;
    }

    // Paragraphs
    if (slideData.paragraphs) {
      slideData.paragraphs.forEach((p) => {
        slide.addText(p, {
          x: 0.5,
          y: currentY,
          w: "90%",
          fontSize: 14,
          color: "475569",
        });
        currentY += Math.max(0.6, Math.ceil(p.length / 100) * 0.4); // rough multiline calc
      });
    }

    // Bullet Points
    if (slideData.bulletPoints) {
      slideData.bulletPoints.forEach((bp) => {
        slide.addText(
          [
            { text: bp.boldText ? bp.boldText + ": " : "", options: { bold: true, color: "1e293b" } },
            { text: bp.text, options: { color: "475569" } }
          ],
          {
            x: 0.7, // Indent
            y: currentY,
            w: "85%",
            fontSize: 14,
            bullet: { code: "2022" }, // Bullet point
            valign: "top"
          }
        );
        currentY += Math.max(0.6, Math.ceil((bp.boldText || "").length + bp.text.length / 90) * 0.5);
      });
    }

    // Table
    if (slideData.table) {
      // Create table data format expected by pptxgen
      const tableRows: any[][] = [
        // Header
        slideData.table.headers.map(header => ({
          text: header,
          options: { bold: true, fill: { color: "0F3D6C" }, color: "FFFFFF" }
        })),
        // Rows
        ...slideData.table.rows.map((row, rIdx) => 
          row.map(cell => ({
            text: cell,
            options: { fill: { color: rIdx % 2 === 0 ? "F0F4F8" : "FFFFFF" }, color: "1e293b" }
          }))
        )
      ];

      slide.addTable(tableRows, {
        x: 0.5,
        y: currentY,
        w: 9.0,
        rowH: 0.4,
        fontSize: 12,
        border: { pt: 1, color: "CBD5E1" }
      });
    }

    // Branding Footers
    slide.addText("FieldMarshal Pumps", { x: 0.5, y: "94%", w: 3, fontSize: 10, color: "0F3D6C", italic: true });
    slide.addText(`Slide ${idx + 1}`, { x: "90%", y: "94%", w: 1, fontSize: 10, color: "0F3D6C", align: "right" });
  });

  await pres.writeFile({ fileName: "Ireland_Water_Pump_Industry_Report.pptx" });
};
