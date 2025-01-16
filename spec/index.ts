import fs from 'node:fs';
import path from 'node:path';
import { PdfDocument } from '../dist';

const parser = new PdfDocument();
parser.load(path.resolve(__dirname, 'test.pdf'))
    .then(doc => fs.writeFileSync('/output_test.json', JSON.stringify(doc, null, 2), 'utf8'))
    .catch(err => console.error(err));