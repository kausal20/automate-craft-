import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { reportSlides } from "@/data/report-content";

export const generateDocx = async () => {
  const children: any[] = [];

  reportSlides.forEach((slide, idx) => {
    // Title
    children.push(
      new Paragraph({
        text: slide.title,
        heading: idx === 0 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        spacing: { after: 200, before: 400 },
      })
    );

    // Subtitle
    if (slide.subtitle) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: slide.subtitle,
              bold: idx === 0, // Request to bold the first slide subtitle
              color: "2ecc71",
              size: 28, // 14pt (multiplied by 2)
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Paragraphs
    if (slide.paragraphs) {
      slide.paragraphs.forEach((p) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: p,
                size: 24, // 12pt
              }),
            ],
            spacing: { after: 200 },
          })
        );
      });
    }

    // Bullet Points
    if (slide.bulletPoints) {
      slide.bulletPoints.forEach((bp) => {
        const textRuns: TextRun[] = [];

        if (bp.boldText) {
          textRuns.push(
            new TextRun({
              text: bp.boldText + ": ",
              bold: true,
              size: 24,
            })
          );
        }

        textRuns.push(
          new TextRun({
            text: bp.text,
            size: 24,
          })
        );

        children.push(
          new Paragraph({
            children: textRuns,
            bullet: { level: 0 },
            spacing: { after: 150 },
          })
        );
      });
    }

    // Table
    if (slide.table) {
      const tableRows = [
        // Header Row
        new TableRow({
          children: slide.table.headers.map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: h, bold: true, color: "FFFFFF" }),
                    ],
                  }),
                ],
                shading: {
                  fill: "0F3D6C",
                },
              })
          ),
        }),
        // Data Rows
        ...slide.table.rows.map((row) =>
          new TableRow({
            children: row.map(
              (cellText) =>
                new TableCell({
                  children: [new Paragraph({ text: cellText })],
                })
            ),
          })
        ),
      ];

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
          },
        })
      );
    }
    
    // Page Break after each slide conceptually except the last
    if (idx < reportSlides.length - 1) {
       children.push(new Paragraph({ pageBreakBefore: true }));
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Ireland_Water_Pump_Industry_Report.docx";
  a.click();
  URL.revokeObjectURL(url);
};
