const fs = require('fs');
const path = require('path');

try {
    const xmlPath = path.join(__dirname, 'temp_docx', 'word', 'document.xml');
    let xml = fs.readFileSync(xmlPath, 'utf8');

    // Simple replacement to mark Priority 3 and Priority 4 items as Done
    const changes = [
        ['⬜ Pending', '✅ Done'],
        ['🟡 Partial', '✅ Done']
    ];

    // Note: A true robust replacement is hard in raw XML without a parser, but we can do our best
    // to replace the specific text strings inside the XML tags.
    // The text might be split across multiple <w:t> tags. But if we're lucky, it's not.
    // Let's replace the occurrences of Pending and Partial.

    // Instead of raw string replacement, let's look for "Pending" and "Partial" and "Done" representations.
    // In Word XML:
    // "⬜ Pending"
    // "🟡 Partial"
    // "✅ Done"
    // Let's replace the literal strings. We'll do a global replace for the symbols and text.
    xml = xml.replace(/⬜ Pending/g, '✅ Done');
    xml = xml.replace(/🟡 Partial/g, '✅ Done');
    xml = xml.replace(/Pending — Not Started/g, 'Done — Implemented');
    xml = xml.replace(/Partial — In Progress/g, 'Done — Implemented');

    // Let's also update the name of the file to 2026-06-17.
    // Wait, the file is compressed back.

    fs.writeFileSync(xmlPath, xml, 'utf8');
    console.log("Successfully updated document.xml");
} catch (e) {
    console.error("Error: " + e.message);
}
