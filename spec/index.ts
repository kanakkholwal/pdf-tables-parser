import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PdfDocument } from '../dist';
import fs from 'node:fs/promises';


try {
    console.log('Running test...');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pdfDoc = new PdfDocument();
    console.log('Loading PDF document...');
    await pdfDoc.load(path.resolve(__dirname, 'table.pdf'));
    console.log('PDF document loaded.');
    console.log(pdfDoc.pages);
    await fs.writeFile(path.resolve(__dirname, 'table.json'), JSON.stringify(pdfDoc.pages, null, 4));
    console.log('Test completed.');
    process.exit(0);
} catch (err) {
    console.error('Error running test:');
    console.error(err);
    process.exit(1);
}