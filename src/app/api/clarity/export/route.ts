import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { auth } from "@/auth";
import fs from 'fs';
import path from 'path';
import { LOGO_DARK_FILE } from '@/lib/logoConfig';

// Helper for wrapping text lines
const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number) => {
    if (typeof text !== 'string') return [];
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
        if (!paragraph) {
            lines.push('');
            continue;
        }
        const words = paragraph.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, size);
            if (width > maxWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
    }
    return lines;
};

// Justified Text Drawer
const drawJustifiedBlock = (page: any, text: string, x: number, y: number, font: PDFFont, size: number, color: any, maxWidth: number, lineHeight: number) => {
    const lines = wrapText(text, font, size, maxWidth);
    let currentY = y;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check Page Break
        if (currentY < 60) return { y: currentY, remainingLines: lines.slice(i), pageBreakNeeded: true };

        const isLastLine = i === lines.length - 1 || lines[i + 1] === '';

        if (isLastLine || !line) {
            page.drawText(line, { x, y: currentY, size, font, color });
        } else {
            const words = line.split(' ');
            if (words.length > 1) {
                const totalWordWidth = words.reduce((acc, w) => acc + font.widthOfTextAtSize(w, size), 0);
                const totalSpace = maxWidth - totalWordWidth;
                const spaceWidth = totalSpace / (words.length - 1);

                let currentX = x;
                for (let j = 0; j < words.length; j++) {
                    page.drawText(words[j], { x: currentX, y: currentY, size, font, color });
                    currentX += font.widthOfTextAtSize(words[j], size) + spaceWidth;
                }
            } else {
                page.drawText(line, { x, y: currentY, size, font, color });
            }
        }
        currentY -= lineHeight;
    }
    return { y: currentY, remainingLines: [], pageBreakNeeded: false };
};

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const { result } = await req.json();

        if (!result || !result.questionContext) {
            return NextResponse.json({ error: "Missing result data" }, { status: 400 });
        }

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        // Assets
        let logoImage: any;
        try {
            const logoPath = path.join(process.cwd(), 'public', LOGO_DARK_FILE);
            if (fs.existsSync(logoPath)) {
                const logoBytes = fs.readFileSync(logoPath);
                logoImage = logoPath.toLowerCase().endsWith('.png')
                    ? await pdfDoc.embedPng(logoBytes)
                    : await pdfDoc.embedJpg(logoBytes);
            }
        } catch (e) {
            console.error("Logo load error", e);
        }

        // Colors
        const goldColor = rgb(0.83, 0.68, 0.21); // #D4AF37
        const darkColor = rgb(0.1, 0.1, 0.1);
        const grayColor = rgb(0.4, 0.4, 0.4);
        const lightGray = rgb(0.9, 0.9, 0.9);

        // --- TITLE PAGE ---
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // 1. Logo
        if (logoImage) {
            const targetWidth = width * 0.25;
            const logoScale = targetWidth / logoImage.width;
            const logoDims = logoImage.scale(logoScale);
            const logoX = (width - logoDims.width) / 2;

            page.drawImage(logoImage, {
                x: logoX,
                y: height - 120 - logoDims.height,
                width: logoDims.width,
                height: logoDims.height,
            });
        }

        // 2. Report Title
        const finalTitle = "Clarity Reflection Report";
        const titleY = height - 350;
        const titleWidth = boldFont.widthOfTextAtSize(finalTitle, 24);
        page.drawText(finalTitle, {
            x: (width - titleWidth) / 2,
            y: titleY,
            size: 24,
            font: boldFont,
            color: darkColor
        });

        const subTitle = "Personalized Astrological Insight";
        const subWidth = font.widthOfTextAtSize(subTitle, 14);
        page.drawText(subTitle, {
            x: (width - subWidth) / 2,
            y: height - 250,
            size: 14,
            font,
            color: goldColor
        });

        // Generated Date Footer
        const now = new Date();
        const dateFooter = `Report Generated: ${now.toLocaleDateString()}`;
        page.drawText(dateFooter, {
            x: (width - font.widthOfTextAtSize(dateFooter, 10)) / 2,
            y: 50,
            size: 10,
            font: italicFont,
            color: grayColor
        });

        // --- CONTENT PAGE ---
        page = pdfDoc.addPage();
        
        const addHeader = (p: any, showLogo = true) => {
            const h = p.getSize().height;
            const w = p.getSize().width;
            if (showLogo && logoImage) {
                const headerH = 40;
                const headerScale = headerH / logoImage.height;
                const headerDims = logoImage.scale(headerScale);
                p.drawImage(logoImage, {
                    x: 50,
                    y: h - 55,
                    width: headerDims.width,
                    height: headerDims.height,
                });
            } else {
                p.drawText('AskChetna', { x: 50, y: h - 50, size: 18, font: boldFont, color: goldColor });
            }
            p.drawText("Clarity Reflection", { x: w - 300, y: h - 40, size: 9, font: boldFont, color: grayColor });
            p.drawText(`Page ${pdfDoc.getPageCount()}`, { x: w - 80, y: h - 40, size: 10, font, color: grayColor });
            p.drawLine({ start: { x: 50, y: h - 60 }, end: { x: w - 50, y: h - 60 }, thickness: 0.5, color: lightGray });
            return h - 90;
        };

        let y = addHeader(page);

        const checkSpace = (needed: number) => {
            if (y < needed) {
                page = pdfDoc.addPage();
                y = addHeader(page);
            }
        };

        const writeSection = (title: string, content: string | string[], italicContent = false) => {
            if (!content) return;
            checkSpace(120);
            page.drawText(title, { x: 50, y, size: 14, font: boldFont, color: goldColor });
            y -= 30;

            const textFont = italicContent ? italicFont : font;
            const textSize = italicContent ? 12 : 11;
            
            if (Array.isArray(content)) {
                for (const item of content) {
                    checkSpace(80);
                    let res = drawJustifiedBlock(page, `• ${item}`, 50, y, textFont, textSize, darkColor, width - 100, 18);
                    while (res.pageBreakNeeded) {
                        page = pdfDoc.addPage();
                        y = addHeader(page);
                        y -= 10;
                        res = drawJustifiedBlock(page, res.remainingLines.join('\n'), 50, y, textFont, textSize, darkColor, width - 100, 18);
                    }
                    y = res.y - 8;
                }
                y -= 20;
            } else {
                let res = drawJustifiedBlock(page, content, 50, y, textFont, textSize, darkColor, width - 100, 18);
                while (res.pageBreakNeeded) {
                    page = pdfDoc.addPage();
                    y = addHeader(page);
                    y -= 10;
                    res = drawJustifiedBlock(page, res.remainingLines.join('\n'), 50, y, textFont, textSize, darkColor, width - 100, 18);
                }
                y = res.y - 30;
            }
        };

        writeSection('The Query', `"${result.questionContext}"`, true);
        
        checkSpace(120);
        page.drawText('Action Verdict', { x: 50, y, size: 14, font: boldFont, color: goldColor });
        
        // Verdict Badge simulation
        const verdictWidth = boldFont.widthOfTextAtSize(result.finalVerdict, 12);
        page.drawRectangle({ x: 160, y: y - 5, width: verdictWidth + 20, height: 20, color: lightGray, borderColor: grayColor, borderWidth: 1 });
        page.drawText(result.finalVerdict, { x: 170, y: y, size: 12, font: boldFont, color: darkColor });
        y -= 40;

        writeSection('Decision Matrix', result.decisionTreeSteps);
        writeSection('Timing of the Soul', result.phaseOverview);
        writeSection('Forces at Play', result.patternInsights);
        writeSection('Path to Awareness', result.actionGuidance);
        writeSection('Contemplations', result.reflectiveQuestions);
        writeSection('Closing', result.ethicalClosing, true);

        // Footer
        const pages = pdfDoc.getPages();
        pages.forEach((p, idx) => {
            if (idx > 0) {
                p.drawText('www.askchetna.com', { x: 50, y: 15, size: 8, font: italicFont, color: grayColor });
            }
        });

        const pdfBytes = await pdfDoc.save();
        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Chetna_Clarity_Report.pdf"`
            }
        });

    } catch (error) {
        console.error("PDF Generation Error", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
