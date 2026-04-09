/**
 * Script to generate a proper .docx Word document from SDS.md
 * with professional cover page and properly formatted diagrams
 */

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageBreak, TableOfContents, SectionType } = require('docx');

// Read SDS content
const sdsContent = fs.readFileSync('SDS.md', 'utf-8');

// Parse markdown content
function parseContent(content) {
    const sections = [];
    const lines = content.split('\n');
    let i = 0;
    let inCodeBlock = false;
    let codeBlockContent = [];
    let inTable = false;
    let tableLines = [];
    
    while (i < lines.length) {
        const line = lines[i];
        
        // Skip main title
        if (line.startsWith('# SOFTWARE DESIGN SPECIFICATION') || line.startsWith('# Kingstone WiFi Billing System')) {
            i++;
            continue;
        }
        
        // Handle code blocks
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                const codeText = codeBlockContent.join('\n');
                const isDiagram = codeText.includes('┌') || codeText.includes('─') || codeText.includes('│') || 
                                  codeText.includes('└') || codeText.includes('▶') || codeText.includes('◀') ||
                                  codeText.includes('├') || codeText.includes('┤');
                sections.push({ type: 'code', content: codeText, isDiagram });
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
            }
            i++;
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent.push(line);
            i++;
            continue;
        }
        
        // Handle headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            sections.push({ 
                type: 'heading', 
                level: headingMatch[1].length, 
                content: headingMatch[2] 
            });
            i++;
            continue;
        }
        
        // Handle horizontal rules
        if (line.trim().match(/^---+$/)) {
            i++;
            continue;
        }
        
        // Handle tables
        if (line.includes('|') && !line.match(/^\|?[-:\s|]+\|?$/)) {
            const potentialTable = [];
            let j = i;
            while (j < lines.length && lines[j].includes('|')) {
                if (!lines[j].match(/^\|?[-:\s|]+\|?$/)) {
                    potentialTable.push(lines[j]);
                }
                j++;
            }
            
            if (potentialTable.length >= 1) {
                sections.push({ type: 'table', rows: potentialTable });
                i = j;
                continue;
            }
        }
        
        // Skip table separator lines
        if (line.match(/^\|?[-:\s|]+\|?$/)) {
            i++;
            continue;
        }
        
        // Handle paragraphs
        if (line.trim()) {
            sections.push({ type: 'paragraph', content: line });
        }
        
        i++;
    }
    
    return sections;
}

// Create text runs with formatting
function createTextRuns(text) {
    const runs = [];
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
    
    for (const part of parts) {
        if (!part) continue;
        
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ 
                text: part.slice(2, -2), 
                bold: true,
                font: 'Arial'
            }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ 
                text: part.slice(1, -1), 
                italics: true,
                font: 'Arial'
            }));
        } else if (part.startsWith('`') && part.endsWith('`')) {
            runs.push(new TextRun({ 
                text: part.slice(1, -1), 
                font: 'Courier New',
                size: 20
            }));
        } else {
            runs.push(new TextRun({ 
                text: part,
                font: 'Arial'
            }));
        }
    }
    
    return runs;
}

// Create table from markdown
function createTable(rows) {
    const tableRows = [];
    
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.length === 0) continue;
        
        const tableCells = cells.map(cell => {
            return new TableCell({
                children: [new Paragraph({
                    children: createTextRuns(cell),
                    style: 'Normal'
                })],
                width: { size: 100 / cells.length, type: WidthType.PERCENTAGE }
            });
        });
        
        tableRows.push(new TableRow({
            children: tableCells
        }));
    }
    
    return new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
    });
}

// Create the document
function createDocument() {
    const sections = parseContent(sdsContent);
    const docChildren = [];
    
    // Cover Page
    docChildren.push(
        new Paragraph({
            children: [new TextRun({
                text: 'KINGSTONE WIFI BILLING SYSTEM',
                bold: true,
                size: 48,
                font: 'Arial',
                underline: {}
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            children: [new TextRun({
                text: 'Software Design Specification (SDS)',
                bold: true,
                size: 32,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        }),
        new Paragraph({
            children: [new TextRun({
                text: 'A Comprehensive WiFi Billing and Management System\nfor ISP Hotspots in Kenya',
                italics: true,
                size: 24,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 1200 }
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        
        // Student details
        new Paragraph({
            children: [
                new TextRun({ text: 'Student Name: ', bold: true, font: 'Arial', size: 24 }),
                new TextRun({ text: 'TRACY [YOUR FULL NAME]', font: 'Arial', size: 24 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Registration Number: ', bold: true, font: 'Arial', size: 24 }),
                new TextRun({ text: '[YOUR REG NUMBER]', font: 'Arial', size: 24 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Supervisor: ', bold: true, font: 'Arial', size: 24 }),
                new TextRun({ text: '[SUPERVISOR NAME]', font: 'Arial', size: 24 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Department: ', bold: true, font: 'Arial', size: 24 }),
                new TextRun({ text: 'Computer Science/Information Technology', font: 'Arial', size: 24 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: 'Institution: ', bold: true, font: 'Arial', size: 24 }),
                new TextRun({ text: '[YOUR UNIVERSITY NAME]', font: 'Arial', size: 24 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        
        new Paragraph({
            children: [new TextRun({
                text: 'Submitted in Partial Fulfillment of the Requirements\nfor the Degree of [DEGREE NAME]',
                font: 'Arial',
                size: 24
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        }),
        
        new Paragraph({
            children: [new TextRun({
                text: 'March 2026',
                bold: true,
                size: 28,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 }
        }),
        
        new PageBreak()
    );
    
    // Title Page
    docChildren.push(
        new Paragraph({
            children: [new TextRun({
                text: 'SOFTWARE DESIGN SPECIFICATION',
                bold: true,
                size: 40,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            children: [new TextRun({
                text: 'Kingstone WiFi Billing System',
                bold: true,
                size: 32,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 }
        }),
        
        // Info table
        new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Document Version:', bold: true, font: 'Arial', size: 22 })] })],
                            width: { size: 40, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: '1.0.0', font: 'Arial', size: 22 })] })]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true, font: 'Arial', size: 22 })] })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'March 31, 2026', font: 'Arial', size: 22 })] })]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By:', bold: true, font: 'Arial', size: 22 })] })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Development Team', font: 'Arial', size: 22 })] })]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Status:', bold: true, font: 'Arial', size: 22 })] })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Production Ready', font: 'Arial', size: 22 })] })]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Document Type:', bold: true, font: 'Arial', size: 22 })] })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: 'Software Design Specification', font: 'Arial', size: 22 })] })]
                        })
                    ]
                })
            ],
            width: { size: 80, type: WidthType.PERCENTAGE }
        }),
        
        new Paragraph({ text: '' }),
        new Paragraph({ text: '' }),
        
        new Paragraph({
            children: [new TextRun({
                text: '© 2026 Kingstone WiFi Billing System\nAll Rights Reserved',
                italics: true,
                size: 20,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER
        }),
        
        new PageBreak()
    );
    
    // Table of Contents
    docChildren.push(
        new Paragraph({
            children: [new TextRun({
                text: 'TABLE OF CONTENTS',
                bold: true,
                size: 32,
                font: 'Arial'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        }),
        new TableOfContents({
            headingStyleRange: '1-4'
        }),
        new PageBreak()
    );
    
    // Process content sections
    for (const section of sections) {
        switch (section.type) {
            case 'heading':
                const headingStyles = {
                    1: { size: 36, bold: true },
                    2: { size: 28, bold: true },
                    3: { size: 24, bold: true },
                    4: { size: 22, bold: true },
                    5: { size: 22, bold: true },
                    6: { size: 22, bold: true }
                };
                const style = headingStyles[section.level] || headingStyles[4];
                docChildren.push(
                    new Paragraph({
                        children: [new TextRun({
                            text: section.content,
                            font: 'Arial',
                            size: style.size,
                            bold: style.bold
                        })],
                        heading: section.level === 1 ? HeadingLevel.HEADING_1 :
                                 section.level === 2 ? HeadingLevel.HEADING_2 :
                                 section.level === 3 ? HeadingLevel.HEADING_3 :
                                 section.level === 4 ? HeadingLevel.HEADING_4 :
                                 HeadingLevel.HEADING_5,
                        spacing: { before: 300, after: 200 }
                    })
                );
                break;
                
            case 'paragraph':
                // Check for list items
                if (section.content.trim().startsWith('- ') || section.content.trim().match(/^\d+\.\s/)) {
                    docChildren.push(
                        new Paragraph({
                            children: createTextRuns(section.content.replace(/^-+\s*/, '').replace(/^\d+\.\s*/, '')),
                            style: 'ListParagraph'
                        })
                    );
                } else {
                    docChildren.push(
                        new Paragraph({
                            children: createTextRuns(section.content),
                            spacing: { after: 200 }
                        })
                    );
                }
                break;
                
            case 'code':
                if (section.isDiagram) {
                    // Diagram - use monospace font, smaller size
                    const lines = section.content.split('\n');
                    for (const line of lines) {
                        docChildren.push(
                            new Paragraph({
                                children: [new TextRun({
                                    text: line || ' ',
                                    font: 'Courier New',
                                    size: 16
                                })],
                                spacing: { after: 50 }
                            })
                        );
                    }
                    docChildren.push(new Paragraph({ text: '' }));
                } else {
                    // Regular code block
                    docChildren.push(
                        new Paragraph({
                            children: [new TextRun({
                                text: section.content,
                                font: 'Courier New',
                                size: 18
                            })],
                            spacing: { before: 200, after: 200 }
                        })
                    );
                }
                break;
                
            case 'table':
                docChildren.push(createTable(section.rows));
                break;
        }
    }
    
    // Document Approval Page
    docChildren.push(
        new PageBreak(),
        new Paragraph({
            children: [new TextRun({
                text: 'DOCUMENT APPROVAL',
                bold: true,
                size: 36,
                font: 'Arial'
            })],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 600 }
        }),
        new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Role', bold: true, font: 'Arial', size: 22 })],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Name', bold: true, font: 'Arial', size: 22 })],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Signature', bold: true, font: 'Arial', size: 22 })],
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Date', bold: true, font: 'Arial', size: 22 })],
                                alignment: AlignmentType.CENTER
                            })]
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Project Manager', font: 'Arial', size: 22 })]
                            })],
                            width: { size: 25, type: WidthType.PERCENTAGE }
                        }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Technical Lead', font: 'Arial', size: 22 })]
                            })]
                        }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'Quality Assurance', font: 'Arial', size: 22 })]
                            })]
                        }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ 
                                children: [new TextRun({ text: 'System Administrator', font: 'Arial', size: 22 })]
                            })]
                        }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] }),
                        new TableCell({ children: [new Paragraph({ text: '' })] })
                    ]
                })
            ],
            width: { size: 100, type: WidthType.PERCENTAGE }
        })
    );
    
    return docChildren;
}

// Create and save document
console.log('Creating Word document...');
const doc = new Document({
    sections: [{
        properties: {
            page: {
                margin: {
                    top: 1440,
                    right: 1440,
                    bottom: 1440,
                    left: 1440
                }
            }
        },
        children: createDocument()
    }]
});

console.log('Packing document...');
Packer.toBuffer(doc).then((buffer) => {
    console.log('Saving file...');
    fs.writeFileSync('Kingstone_WiFi_Billing_SDS.docx', buffer);
    console.log('Done! Document saved as "Kingstone_WiFi_Billing_SDS.docx"');
}).catch((err) => {
    console.error('Error:', err);
});
