import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { LOGO_DARK_FILE, LOGO_LIGHT_FILE } from '@/lib/logoConfig';

export interface ReportContent {
    chapter1_SoulPurpose: string;
    chapter2_CareerSuccess: string;
    chapter3_LoveAndConnection: string;
    chapter4_HealthAndVitality: string;
    chapter5_YearlyHorizon: string;
    chapter6_Strengths: string;
    chapter7_Bottlenecks: string;
    chapter8_KarmicLessons: string;
    chapter9_PracticalWisdom: string;
    chapter10_SagesClosing: string;
}

export async function generateReportPDF(name: string, content: ReportContent, chartData?: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    // Embed fonts
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bodyFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const gold = rgb(0.77, 0.63, 0.16); // #C5A028
    const charcoal = rgb(0.1, 0.1, 0.1); // #1A1A1A
    const lightGray = rgb(0.4, 0.4, 0.4); // #666666
    const white = rgb(1, 1, 1);
    const adBackground = rgb(0.98, 0.96, 0.90);

    // Load Logos
    let logoDark: any = null;
    let logoLight: any = null;
    try {
        const darkLogoPath = path.join(process.cwd(), 'public', LOGO_DARK_FILE);
        const lightLogoPath = path.join(process.cwd(), 'public', LOGO_LIGHT_FILE);
        const logoDarkBytes = await fs.readFile(darkLogoPath);
        const logoLightBytes = await fs.readFile(lightLogoPath);

        logoDark = darkLogoPath.toLowerCase().endsWith('.jpg') || darkLogoPath.toLowerCase().endsWith('.jpeg')
            ? await pdfDoc.embedJpg(logoDarkBytes)
            : await pdfDoc.embedPng(logoDarkBytes);

        logoLight = lightLogoPath.toLowerCase().endsWith('.jpg') || lightLogoPath.toLowerCase().endsWith('.jpeg')
            ? await pdfDoc.embedJpg(logoLightBytes)
            : await pdfDoc.embedPng(logoLightBytes);
    } catch (e) {
        console.warn('Logos not found for PDF, proceeding without them.', e);
    }

    // --- Helper: Draw Justified Text ---
    const drawJustifiedText = (
        text: string,
        x: number,
        y: number,
        width: number,
        font: PDFFont,
        size: number,
        lineHeight: number,
        page: PDFPage
    ): number => {
        const words = text.split(/\s+/);
        let currentLine: string[] = [];
        let currentY = y;

        for (const word of words) {
            const testLine = [...currentLine, word].join(' ');
            const testWidth = font.widthOfTextAtSize(testLine, size);

            if (testWidth <= width) {
                currentLine.push(word);
            } else {
                // Draw current line justified
                if (currentLine.length === 1) {
                    page.drawText(currentLine[0], { x, y: currentY, size, font, color: charcoal });
                } else {
                    const lineText = currentLine.join('');
                    const textWidth = font.widthOfTextAtSize(lineText, size);
                    const spaceAvailable = width - textWidth;
                    const spaces = currentLine.length - 1;
                    const spaceWidth = spaceAvailable / spaces;

                    let currentX = x;
                    for (let i = 0; i < currentLine.length; i++) {
                        page.drawText(currentLine[i], { x: currentX, y: currentY, size, font, color: charcoal });
                        currentX += font.widthOfTextAtSize(currentLine[i], size) + spaceWidth;
                    }
                }

                currentY -= lineHeight;
                currentLine = [word];
            }
        }
        // Draw last line left-aligned
        if (currentLine.length > 0) {
            page.drawText(currentLine.join(' '), { x, y: currentY, size, font, color: charcoal });
            currentY -= lineHeight;
        }

        return currentY; // Return new Y position
    };

    // --- Helper: Draw South Indian Chart ---
    const drawChart = (page: PDFPage, x: number, y: number, size: number, data: any, title: string) => {
        // Draw Outer Box
        page.drawRectangle({ x, y: y - size, width: size, height: size, borderColor: gold, borderWidth: 1 });

        // Draw Header
        page.drawText(title, { x, y: y + 5, size: 10, font: bodyFontBold, color: charcoal });

        const cellSize = size / 4;

        // Helper to draw cell
        const drawCell = (row: number, col: number, content: string) => {
            // South Indian Layout Mapping (0,0 is Top-Left)
            // But we need to map signs to cells. 
            // Fixed South Indian Layout:
            // Pisces(12)-Ar(1)-Ta(2)-Ge(3) -> Top Row
            // Aq(11) -> Left 2                 Can(4) -> Right 2
            // Cap(10) -> Left 3                Leo(5) -> Right 3
            // Sag(9)-Sc(8)-Li(7)-Vir(6) -> Bottom Row? No.
            // Standard:
            // 12 1 2 3
            // 11     4
            // 10     5
            // 9  8 7 6

            const cellX = x + (col * cellSize);
            const cellY = y - (row * cellSize) - cellSize; // PDF Y is bottom-up, but we draw top-down logic

            page.drawRectangle({ x: cellX, y: cellY, width: cellSize, height: cellSize, borderColor: gold, borderWidth: 0.5 });

            if (content) {
                // Center text in cell
                // Split content if multiple planets
                const parts = content.split(',');
                let textY = cellY + cellSize - 10;
                for (const part of parts) {
                    // simplified rendering
                    if (textY > cellY + 5) { // crop check
                        page.drawText(part.trim().substring(0, 3), { x: cellX + 5, y: textY, size: 8, font: bodyFont, color: charcoal });
                        textY -= 10;
                    }
                }
            }
        };

        // Map planets to signs (1-12)
        const signContent: Record<number, string[]> = {};
        if (data && data.planets) {
            Object.entries(data.planets).forEach(([pName, pData]: [string, any]) => {
                let sign = Math.floor(pData.longitude / 30) + 1;
                // If using mock/simple data without longitude, fallback or check format
                // Assuming standard 0-360 longitude
                if (!signContent[sign]) signContent[sign] = [];
                const shortName = pName.substring(0, 2); // Su, Mo, Ma
                signContent[sign].push(shortName);
            });
            // Add Ascendant
            if (data.ascendant) {
                let ascSign = Math.floor(data.ascendant / 30) + 1;
                if (!signContent[ascSign]) signContent[ascSign] = [];
                signContent[ascSign].push('Asc');
            }
        }

        // Layout Cells
        // Row 0 (Top): 12, 1, 2, 3
        drawCell(0, 0, (signContent[12] || []).join(','));
        drawCell(0, 1, (signContent[1] || []).join(','));
        drawCell(0, 2, (signContent[2] || []).join(','));
        drawCell(0, 3, (signContent[3] || []).join(','));

        // Row 1: 11 (Left), 4 (Right)
        drawCell(1, 0, (signContent[11] || []).join(','));
        drawCell(1, 3, (signContent[4] || []).join(','));

        // Row 2: 10 (Left), 5 (Right)
        drawCell(2, 0, (signContent[10] || []).join(','));
        drawCell(2, 3, (signContent[5] || []).join(','));

        // Row 3 (Bottom): 9, 8, 7, 6 
        drawCell(3, 0, (signContent[9] || []).join(','));
        drawCell(3, 1, (signContent[8] || []).join(','));
        drawCell(3, 2, (signContent[7] || []).join(','));
        drawCell(3, 3, (signContent[6] || []).join(','));
    };

    // --- Helper: Ad Banner ---
    const drawAdBanner = (page: PDFPage, y: number, width: number) => {
        page.drawRectangle({
            x: 50,
            y: y - 60,
            width: width - 100,
            height: 60,
            color: adBackground,
            bar: 5
        } as any); // cast for simplified props if needed, but standard is color

        page.drawText('Unlock deeper clarity. Ask specific questions at chetna.ai', {
            x: 70,
            y: y - 40,
            size: 10,
            font: bodyFontBold,
            color: gold
        });

        page.drawText('Understand your path with real-time AI guidance.', {
            x: 70,
            y: y - 55,
            size: 9,
            font: bodyFont,
            color: charcoal
        });
    };


    // --- Cover Page ---
    const coverPage = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = coverPage.getSize();

    coverPage.drawRectangle({ x: 0, y: 0, width, height, color: charcoal });

    // Improved Logo on Cover (sized by target width for the horizontal lockup)
    if (logoLight) {
        const logoDims = logoLight.scale(280 / logoLight.width);
        coverPage.drawImage(logoLight, {
            x: (width - logoDims.width) / 2,
            y: height - 170,
            width: logoDims.width,
            height: logoDims.height,
        });
    }

    coverPage.drawText('AskChetna', {
        x: (width - titleFont.widthOfTextAtSize('AskChetna', 44)) / 2,
        y: height - 400,
        size: 44,
        font: titleFont,
        color: gold,
    });

    const subtitleText = 'Premium Life Guidance Report';
    coverPage.drawText(subtitleText, {
        x: (width - bodyFont.widthOfTextAtSize(subtitleText, 18)) / 2,
        y: height - 440,
        size: 18,
        font: bodyFont,
        color: white,
    });

    const preparedText = `Prepared for ${name}`;
    coverPage.drawText(preparedText, {
        x: (width - bodyFont.widthOfTextAtSize(preparedText, 14)) / 2,
        y: height - 470,
        size: 14,
        font: bodyFont,
        color: gold,
    });

    // --- Content Pages ---
    const chapters = [
        { title: 'I. The Inner Calling', key: 'chapter1_SoulPurpose' },
        { title: 'II. Professional Rhythm', key: 'chapter2_CareerSuccess' },
        { title: 'III. Magnetic Connection', key: 'chapter3_LoveAndConnection' },
        { title: 'IV. Energetic Vitality', key: 'chapter4_HealthAndVitality' },
        { title: 'V. The Yearly Horizon', key: 'chapter5_YearlyHorizon' }, // Shortened title for header
        { title: 'VI. Strengths & Superpowers', key: 'chapter6_Strengths' },
        { title: 'VII. Potential Bottlenecks', key: 'chapter7_Bottlenecks' },
        { title: 'VIII. Karmic Lessons', key: 'chapter8_KarmicLessons' },
        { title: 'IX. Practical Wisdom', key: 'chapter9_PracticalWisdom' },
        { title: 'X. The Sage\'s Closing', key: 'chapter10_SagesClosing' }
    ];

    let pageIndex = 0;

    // Draw Chart on First Content Page (Soul Purpose)
    // Actually, let's create a dedicated "Charts" intro page or put it on Page 2

    // Let's iterate chapters
    for (const chapter of chapters) {
        let page = pdfDoc.addPage([595.28, 841.89]);
        pageIndex++;
        const margin = 50;
        const chatContent = content[chapter.key as keyof ReportContent] || "";

        // Decorative Border
        page.drawRectangle({
            x: 20, y: 20, width: width - 40, height: height - 40,
            borderColor: gold, borderWidth: 0.5,
            opacity: 0.3
        });

        // Header Logo
        if (logoDark) {
            const logoDims = logoDark.scale(150 / logoDark.width);
            page.drawImage(logoDark, {
                x: width - logoDims.width - 40,
                y: height - 58,
                width: logoDims.width,
                height: logoDims.height,
            });
        }

        page.drawText(chapter.title, { x: margin, y: height - 80, size: 20, font: titleFont, color: gold });
        page.drawLine({ start: { x: margin, y: height - 95 }, end: { x: margin + 250, y: height - 95 }, thickness: 1, color: gold });

        const fontSize = 11;
        const lineHeight = 18; // Increased for readability

        let y = height - 130; // Reset y for text content
        y = drawJustifiedText(chatContent, margin, y, width - (margin * 2), bodyFont, fontSize, lineHeight, page);

        // Special Insert: Chart AFTER Chapter 1 text
        if (chapter.key === 'chapter1_SoulPurpose' && chartData) {
            const chartSize = 150;
            if (y < chartSize + 60) {
                page = pdfDoc.addPage([595.28, 841.89]);
                y = height - 80;
                // Re-add border/logo for new page
                page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: gold, borderWidth: 0.5, opacity: 0.3 });
                if (logoDark) {
                    const logoDims = logoDark.scale(150 / logoDark.width);
                    page.drawImage(logoDark, {
                        x: width - logoDims.width - 40,
                        y: height - 58,
                        width: logoDims.width,
                        height: logoDims.height,
                    });
                }
            }
            drawChart(page, (width - chartSize) / 2, y - 20, chartSize, chartData, 'Your Cosmic Map (D1)');
            y -= (chartSize + 40);
        }

        // Ad Banner on even pages
        if (pageIndex % 2 === 0) {
            drawAdBanner(page, 100, width);
        }

        // Footer
        page.drawText(`AskChetna AI | ${name} | Awareness, not prediction.`, {
            x: 60,
            y: 40,
            size: 8,
            font: bodyFont,
            color: lightGray
        });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
