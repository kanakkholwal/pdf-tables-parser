# pdf-tables-parser

[![npm version](https://badge.fury.io/js/pdf-tables-parser.svg)](https://www.npmjs.com/package/pdf-tables-parser)

**pdf-tables-parser** is a JavaScript/TypeScript library designed to extract text tables from PDF files efficiently. It provides tools to parse PDF documents and extract structured table data with minimal effort, enabling you to handle tabular data in PDF files seamlessly.

## Features

- Extract tables from PDF files with ease.
- Support for multi-page PDFs.
- Handles text with overlapping and complex layouts.
- Configurable options to tailor table extraction.
- Lightweight and easy to integrate.

## Installation

Install the library using npm:

```bash
npm install pdf-tables-parser
# or
pnpm add pdf-tables-parser
```

## Usage

Here’s a basic example of how to use the library:

```javascript
import { PdfDocument } from 'pdf-tables-parser';
import fs from 'fs';

(async () => {
    const pdfBuffer = fs.readFileSync('example.pdf');
    const pdfDoc = new PdfDocument({
        hasTitles: true,  // Indicates if tables have titles
        threshold: 1.5,  // Adjusts the y-axis grouping sensitivity
        maxStrLength: 30, // Maximum string length for a cell
        ignoreTexts: ['Example Ignored Text'] // Texts to ignore during extraction
    });

    await pdfDoc.load(pdfBuffer);

    pdfDoc.pages.forEach((page) => {
        console.log(`Page ${page.pageNumber} Tables:`);
        page.tables.forEach((table, index) => {
            console.log(`Table ${index + 1}:`, table.data);
        });
    });
})();
```

## Options

The `PdfDocument` constructor accepts the following configuration options:

| Option          | Type      | Default       | Description                                  |
|-----------------|-----------|---------------|----------------------------------------------|
| `hasTitles`     | `boolean` | `true`        | Indicates whether tables have title rows.   |
| `threshold`     | `number`  | `1.5`         | Sensitivity for grouping rows by y-axis.    |
| `maxStrLength`  | `number`  | `30`          | Maximum string length for table cells.      |
| `ignoreTexts`   | `string[]`| `[]`          | Array of texts to ignore during extraction. |

## API

### `PdfDocument`

#### Properties:
- `numPages`: Number of pages in the PDF document.
- `pages`: Array of parsed pages, each containing:
  - `pageNumber`: Page number in the PDF.
  - `tables`: Array of extracted tables.

#### Methods:
- `load(source: string | Buffer): Promise<void>`: Loads and processes the PDF file.

### `PdfTable`

#### Properties:
- `tableNumber`: Identifier for the table.
- `numrows`: Number of rows in the table.
- `numcols`: Number of columns in the table.
- `data`: 2D array representing table data.

## Dependencies

- [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist): PDF rendering library.
- [tslib](https://www.npmjs.com/package/tslib): Runtime library for TypeScript.

## Development

To build the project locally:

```bash
git clone https://github.com/kanakkholwal/pdf-tables-parser.git
cd pdf-tables-parser
npm install
npm run build
```

Run tests:

```bash
npm test
```

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request on [GitHub](https://github.com/kanakkholwal/pdf-tables-parser).

## License

This project is licensed under the ISC License. See the LICENSE file for details.

## Support

For issues and suggestions, please visit the [GitHub issues page](https://github.com/kanakkholwal/pdf-tables-parser/issues).
