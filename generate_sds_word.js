/**
 * Script to convert SDS.md to a properly formatted Word document
 * with a professional cover page for Final Year Project
 */

const fs = require('fs');
const path = require('path');

// We'll create a simplified HTML version that can be opened in Word
// Word can open HTML files and preserve formatting

function createHTMLDocument() {
    // Read the SDS markdown file
    const sdsContent = fs.readFileSync('SDS.md', 'utf-8');
    
    // Parse markdown to HTML
    const htmlContent = parseMarkdownToHTML(sdsContent);
    
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>Kingstone WiFi Billing System - SDS</title>
    <style>
        @page {
            size: A4;
            margin: 2.54cm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
            background-color: #ffffff;
        }
        .cover-page {
            page-break-after: always;
            text-align: center;
            padding: 100px 0;
        }
        .cover-title {
            font-size: 24pt;
            font-weight: bold;
            text-decoration: underline;
            margin-bottom: 20px;
        }
        .cover-subtitle {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 40px;
        }
        .cover-description {
            font-size: 12pt;
            font-style: italic;
            margin-bottom: 60px;
        }
        .cover-details {
            font-size: 12pt;
            margin-bottom: 10px;
        }
        .cover-details-label {
            font-weight: bold;
        }
        .cover-date {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 40px;
        }
        .title-page {
            page-break-after: always;
            text-align: center;
            padding: 50px 0;
        }
        .title-main {
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .title-project {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 40px;
        }
        .info-table {
            width: 80%;
            margin: 0 auto 40px auto;
            border-collapse: collapse;
        }
        .info-table td {
            border: 1px solid #000000;
            padding: 8px;
            font-size: 11pt;
        }
        .info-table td:first-child {
            font-weight: bold;
            width: 40%;
        }
        .copyright {
            font-size: 10pt;
            font-style: italic;
        }
        .toc-page {
            page-break-after: always;
        }
        .toc-title {
            font-size: 16pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 30px;
        }
        .toc-item {
            font-size: 11pt;
            margin-bottom: 5px;
        }
        h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-top: 24pt;
            margin-bottom: 12pt;
            page-break-after: avoid;
        }
        h2 {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 18pt;
            margin-bottom: 10pt;
            page-break-after: avoid;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 14pt;
            margin-bottom: 8pt;
            page-break-after: avoid;
        }
        h4 {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 12pt;
            margin-bottom: 6pt;
            page-break-after: avoid;
        }
        p {
            margin-bottom: 10pt;
            text-align: justify;
        }
        ul, ol {
            margin-bottom: 10pt;
            margin-top: 5pt;
        }
        li {
            margin-bottom: 5pt;
        }
        .code-block {
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            background-color: #f5f5f5;
            border: 1px solid #dddddd;
            padding: 10px;
            margin: 10px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .diagram {
            font-family: 'Courier New', monospace;
            font-size: 8pt;
            background-color: #ffffff;
            border: 1px solid #000000;
            padding: 10px;
            margin: 15px 0;
            white-space: pre;
            overflow-x: auto;
            line-height: 1.2;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
            font-size: 10pt;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .inline-code {
            font-family: 'Courier New', monospace;
            font-size: 10pt;
            background-color: #f5f5f5;
            padding: 2px 4px;
        }
        .approval-table {
            width: 100%;
            margin-top: 20px;
        }
        .approval-table td {
            border: 1px solid #000000;
            padding: 15px 10px;
            height: 40px;
        }
        .approval-table td:first-child {
            font-weight: bold;
            width: 25%;
        }
        hr {
            border: none;
            border-top: 1px solid #000000;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover-page">
        <div class="cover-title">KINGSTONE WIFI BILLING SYSTEM</div>
        <div class="cover-subtitle">Software Design Specification (SDS)</div>
        <div class="cover-description">
            A Comprehensive WiFi Billing and Management System<br>
            for ISP Hotspots in Kenya
        </div>
        
        <div style="height: 60px;"></div>
        
        <div class="cover-details">
            <span class="cover-details-label">Student Name:</span> TRACY [YOUR FULL NAME]
        </div>
        <div class="cover-details">
            <span class="cover-details-label">Registration Number:</span> [YOUR REG NUMBER]
        </div>
        <div class="cover-details">
            <span class="cover-details-label">Supervisor:</span> [SUPERVISOR NAME]
        </div>
        <div class="cover-details">
            <span class="cover-details-label">Department:</span> Computer Science/Information Technology
        </div>
        <div class="cover-details">
            <span class="cover-details-label">Institution:</span> [YOUR UNIVERSITY NAME]
        </div>
        
        <div style="height: 40px;"></div>
        
        <div class="cover-details">
            Submitted in Partial Fulfillment of the Requirements<br>
            for the Degree of [DEGREE NAME]
        </div>
        
        <div class="cover-date">March 2026</div>
    </div>

    <!-- Title Page -->
    <div class="title-page">
        <div class="title-main">SOFTWARE DESIGN SPECIFICATION</div>
        <div class="title-project">Kingstone WiFi Billing System</div>
        
        <div style="height: 30px;"></div>
        
        <table class="info-table">
            <tr>
                <td>Document Version:</td>
                <td>1.0.0</td>
            </tr>
            <tr>
                <td>Date:</td>
                <td>March 31, 2026</td>
            </tr>
            <tr>
                <td>Prepared By:</td>
                <td>Development Team</td>
            </tr>
            <tr>
                <td>Status:</td>
                <td>Production Ready</td>
            </tr>
            <tr>
                <td>Document Type:</td>
                <td>Software Design Specification</td>
            </tr>
        </table>
        
        <div class="copyright">
            © 2026 Kingstone WiFi Billing System<br>
            All Rights Reserved
        </div>
    </div>

    <!-- Table of Contents -->
    <div class="toc-page">
        <div class="toc-title">TABLE OF CONTENTS</div>
        <div class="toc-item">1. INTRODUCTION ........................................................................ 1</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;1.1 Purpose ............................................................................................ 1</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;1.2 Scope .............................................................................................. 1</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;1.3 Definitions and Acronyms ................................................................... 2</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;1.4 References ......................................................................................... 3</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;1.5 Document Overview ........................................................................... 3</div>
        <div class="toc-item">2. SYSTEM OVERVIEW .................................................................. 4</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.1 System Context ................................................................................... 4</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.2 System Functions ................................................................................. 5</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.3 User Classes and Characteristics ........................................................... 6</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.4 Operating Environment ........................................................................ 7</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.5 Design Constraints ............................................................................... 8</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;2.6 Assumptions and Dependencies ............................................................. 8</div>
        <div class="toc-item">3. ARCHITECTURAL DESIGN ........................................................... 9</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;3.1 High-Level Architecture ........................................................................ 9</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;3.2 Technology Stack ............................................................................... 11</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;3.3 Architecture Patterns .......................................................................... 12</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;3.4 System Flow Diagrams ........................................................................ 13</div>
        <div class="toc-item">4. DATABASE DESIGN ................................................................... 16</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;4.1 Database Schema Overview .................................................................. 16</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;4.2 Table Specifications ............................................................................. 18</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;4.3 Database Functions (RPC) .................................................................... 25</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;4.4 Data Integrity Constraints .................................................................... 27</div>
        <div class="toc-item">5. INTERFACE DESIGN ................................................................... 28</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;5.1 User Interfaces ................................................................................... 28</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;5.2 API Interfaces ...................................................................................... 30</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;5.3 Hardware Interfaces ........................................................................... 32</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;5.4 Communication Interfaces ................................................................... 33</div>
        <div class="toc-item">6. COMPONENT DESIGN ................................................................ 34</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;6.1 Frontend Components ......................................................................... 34</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;6.2 Backend Components (Edge Functions) .................................................. 36</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;6.3 Utility Components .............................................................................. 38</div>
        <div class="toc-item">7. SECURITY DESIGN ..................................................................... 39</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;7.1 Authentication Security ........................................................................ 39</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;7.2 Authorization Security .......................................................................... 41</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;7.3 Data Protection ................................................................................... 42</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;7.4 API Security ........................................................................................ 43</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;7.5 Audit Logging ..................................................................................... 45</div>
        <div class="toc-item">8. INTEGRATION DESIGN ............................................................... 46</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;8.1 M-Pesa Integration .............................................................................. 46</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;8.2 Mikrotik Integration ............................................................................. 48</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;8.3 SMS Gateway Integration ..................................................................... 49</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;8.4 Integration Error Handling ................................................................... 50</div>
        <div class="toc-item">9. DEPLOYMENT DESIGN ............................................................... 51</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;9.1 Deployment Architecture ...................................................................... 51</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;9.2 Environment Configuration ................................................................... 52</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;9.3 Deployment Steps ............................................................................... 53</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;9.4 CI/CD Pipeline .................................................................................... 54</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;9.5 Monitoring and Logging ...................................................................... 55</div>
        <div class="toc-item">10. TESTING STRATEGY .................................................................. 56</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;10.1 Testing Levels .................................................................................... 56</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;10.2 Test Data Management ....................................................................... 57</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;10.3 Performance Testing .......................................................................... 58</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;10.4 Security Testing .................................................................................. 58</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;10.5 Test Coverage Goals .......................................................................... 59</div>
        <div class="toc-item">11. APPENDICES ........................................................................... 60</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix A: Database Migration Scripts .................................................... 60</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix B: Edge Function Code .............................................................. 60</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix C: API Reference ....................................................................... 60</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix D: Troubleshooting Guide .......................................................... 61</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix E: Glossary .............................................................................. 61</div>
        <div class="toc-item">&nbsp;&nbsp;&nbsp;&nbsp;Appendix F: Revision History ................................................................... 62</div>
        <div class="toc-item">DOCUMENT APPROVAL .............................................................. 63</div>
    </div>

    <!-- Main Content -->
    ${htmlContent}

    <!-- Document Approval -->
    <h1>DOCUMENT APPROVAL</h1>
    <table class="approval-table">
        <tr>
            <th>Role</th>
            <th>Name</th>
            <th>Signature</th>
            <th>Date</th>
        </tr>
        <tr>
            <td>Project Manager</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Technical Lead</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>Quality Assurance</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>System Administrator</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    </table>
</body>
</html>`;

    return html;
}

function parseMarkdownToHTML(markdown) {
    let html = markdown;
    
    // Remove the main title (already in cover page)
    html = html.replace(/^#\s+SOFTWARE DESIGN SPECIFICATION.*$/im, '');
    html = html.replace(/^#\s+Kingstone WiFi Billing System.*$/im, '');
    
    // Convert headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    
    // Convert code blocks (preserve diagrams)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        // Check if it's a diagram (contains ASCII art characters)
        if (code.includes('┌') || code.includes('─') || code.includes('│') || code.includes('└') || code.includes('├') || code.includes('┤') || code.includes('┬') || code.includes('┴') || code.includes('┼') || code.includes('▶') || code.includes('◀')) {
            return `<div class="diagram">${escapeHtml(code)}</div>`;
        }
        return `<div class="code-block">${escapeHtml(code)}</div>`;
    });
    
    // Convert tables
    html = convertTables(html);
    
    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
    
    // Convert horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');
    
    // Convert unordered lists
    html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert ordered lists
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // Convert paragraphs
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    
    for (let line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('<div') || trimmed.startsWith('<table') || trimmed.startsWith('</')) {
            if (!inList && trimmed) {
                processedLines.push(line);
            } else {
                processedLines.push(line);
            }
            if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) inList = true;
            if (trimmed.startsWith('</ul') || trimmed.startsWith('</ol')) inList = false;
        } else if (trimmed) {
            if (!inList) {
                processedLines.push(`<p>${trimmed}</p>`);
            } else {
                processedLines.push(line);
            }
        } else {
            processedLines.push(line);
        }
    }
    
    html = processedLines.join('\n');
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)\s*<\/p>/g, '$1');
    
    return html;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function convertTables(html) {
    // Simple table conversion - find markdown tables and convert to HTML
    const tableRegex = /(\|.+\|\n)\|[-:\s|]+\|(\n\|.+\|)+/g;
    
    return html.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        
        let tableHtml = '<table>\n';
        
        // Header row
        const headers = lines[0].split('|').filter(cell => cell.trim());
        tableHtml += '<tr>\n';
        for (const header of headers) {
            tableHtml += `<th>${header.trim()}</th>\n`;
        }
        tableHtml += '</tr>\n';
        
        // Data rows (skip separator line)
        for (let i = 2; i < lines.length; i++) {
            const cells = lines[i].split('|').filter(cell => cell.trim());
            if (cells.length > 0) {
                tableHtml += '<tr>\n';
                for (const cell of cells) {
                    tableHtml += `<td>${cell.trim()}</td>\n`;
                }
                tableHtml += '</tr>\n';
            }
        }
        
        tableHtml += '</table>\n';
        return tableHtml;
    });
}

// Main execution
console.log('Generating Word document...');
const htmlContent = createHTMLDocument();
fs.writeFileSync('Kingstone_WiFi_Billing_SDS.html', htmlContent, 'utf-8');
console.log('Done! File saved as "Kingstone_WiFi_Billing_SDS.html"');
console.log('\nTo open in Word:');
console.log('1. Double-click the HTML file, or');
console.log('2. Open Word and go to File > Open > Browse to the HTML file');
console.log('3. Word will preserve all formatting and diagrams');
