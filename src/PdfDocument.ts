import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import * as pdfJsLib from 'pdfjs-dist';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { PdfTable } from './PdfTable';
import type { Options, PdfPage } from './types';


pdfJsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  
interface _PdfString {
    x: number; y: number; x2: number; y2: number;
    s: string;
}

type _PdfRow = _PdfString[];

interface _PdfColumn {
    x: number; x2: number;
}

interface _PdfPreTable {
    tableNumber: number;
    rows: _PdfRow[];
}

export class PdfDocument {
    private _options: Options;

    public numPages: number;
    public pages: PdfPage[];

    constructor(_options?: Options) {
        const options = Object.assign({ hasTitles: true, threshold: 1.5, maxStrLength: 30, ignoreTexts: [] }, _options);
        if (!Array.isArray(options.ignoreTexts))
            options.ignoreTexts = [options.ignoreTexts ?? ''];
        this._options = options;
        this.numPages = 0;
        this.pages = [];
    }

    async load(source: string | Buffer): Promise<void> {
        let pdfDriver: PDFDocumentProxy | undefined;
        try {
            pdfDriver = await pdfJsLib.getDocument(source).promise as PDFDocumentProxy;
            this.numPages = pdfDriver.numPages;
            this.pages = [];
            for (let i = 1; i <= this.numPages; i++) {
                const page = await pdfDriver.getPage(i) as PDFPageProxy;
                const content = (await page.getTextContent() as TextContent)
                    .items
                    .filter(i => 'transform' in i)
                    .map(i => setTextBounds(i as TextItem));
                this.pages.push({
                    pageNumber: i,
                    tables: this._extractTables(content)
                });
            }
        } catch (error) {
            console.error("Error loading PDF document:", error);
        } finally {
            if (pdfDriver) {
                pdfDriver.destroy();
            }
        }

        function setTextBounds(i: TextItem) {
            const x = i.transform[4];
            const y = i.transform[5];
            const s = i.str;
            const x2 = x + i.width;
            const y2 = y - i.height;
            return { x, x2, y, y2, s };
        }
    }

    private _extractTables(text: _PdfRow): PdfTable[] {
        const { max, min } = Math;
        const me = this;
        text.sort((a, b) => b.y - a.y || a.x - b.x);
        const rows = this._extractRows(text);
        const tables = this._splitTables(rows);
        return tables.map(normalizeColumns);

        function normalizeColumns(table: _PdfPreTable): PdfTable {
            const rows = table.rows;
            const cols = infereColumnBounds();
            const data = rows.map(adjustToBounds);
            mergeColumns(cols, data);

            return new PdfTable({
                tableNumber: table.tableNumber,
                numrows: rows.length,
                numcols: cols.length,
                data
            });

            function adjustToBounds(row: _PdfRow): string[] {
                const data: string[] = [];
                for (const str of row) {
                    const colIndex = cols.findIndex(c => intersect(str, c));
                    if (data[colIndex]) data[colIndex] += ` ${str.s}`;
                    else data[colIndex] = str.s;
                }
                return data;
            }

            function mergeColumns(cols: _PdfColumn[], data: string[][]) {
                let t = 0;
                for (; t < data.length && data[t] && (data[t]?.filter(i => i).length ?? 0) <= 1; t++);
                const title = data[t];

                for (let i = 0; i < cols.length - 1; i++) {
                    if (title?.[i] && !title[i + 1] && countA(i) === 0 && countA(i + 1) > 0) {
                        cols.splice(i + 1, 1);

                        for (let j = t + 1; j < data.length; j++) {
                            const row = data[j];
                            if (row?.[i + 1]) {
                                row[i] = row[i + 1] as string;
                                data[j] = row;
                            }
                        }
            
                        for (const r of data) {
                            if (r) {
                                r.splice(i + 1, 1);
                            }
                        }
                    }
                }
                function countA(col: number): number {
                    let count = 0;
                    for (let i = t + 1; i < data.length; i++)
                        if (data[i]?.[col]) count++;
                    return count;
                }
            }

            function infereColumnBounds(): _PdfColumn[] {
                const { minX, maxX } = getMinMaxX();
                const result: _PdfColumn[] = [];
                const increment = (maxX - minX) / 200;
                for (let x = minX; x < maxX; x += increment) {
                    for (const row of rows) {
                        for (const str of row) {
                            if (str.s.length > (me._options.maxStrLength ?? 30)
                                || (me._options.ignoreTexts as string[]).some(ig => str.s.includes(ig)))
                                continue;

                            if (str.x <= x && x <= str.x2) {
                                const col = result.find(c => intersect(str, c));
                                if (col) {
                                    col.x = min(col.x, str.x);
                                    col.x2 = max(col.x2, str.x2);
                                } else {
                                    result.push({ x: str.x, x2: str.x2 });
                                }
                            }
                        }
                    }
                }
                return result.sort((a, b) => a.x - b.x);
            }
            function getMinMaxX() {
                let minX = 1e3;
                let maxX = -1;
                for (const row of rows) {
                    for (const str of row) {
                        minX = min(minX, str.x);
                        maxX = max(maxX, str.x2);
                    }
                }
                return { minX, maxX };
            }
        }
    }

    private _splitTables(rows: _PdfRow[]): _PdfPreTable[] {
        const tables: _PdfPreTable[] = [];
        let tableNumber = 1;
        let tableRow: _PdfRow[] = [];
        rows.forEach((row, i) => {
            const prev: _PdfString | undefined = i > 0 && rows[i - 1] ? rows[i - 1]?.[0] as _PdfString : undefined;
            const curr = row[0];
            if ((prev && curr) && curr.y < 2 * prev.y2 - prev.y) addTable();
            tableRow.push(row);
        });
        addTable();

        return tables;

        function addTable() {
            tables.push({
                tableNumber: tableNumber++,
                rows: tableRow
            });
            tableRow = [];
        }
    }

    private _extractRows(row: _PdfRow): _PdfRow[] {
        const rows: _PdfRow[] = [];
        while (row.length)
            rows.push(this._extractNextRow(row));
        return rows;
    }

    private _extractNextRow(text: _PdfRow): _PdfRow {
        const row: _PdfRow = [];
        const skipped: _PdfRow = [];
        let t: _PdfString | undefined;

        t = text.shift();
        while (t !== undefined) {
            const yOk = row[0] ? Math.abs(t.y - row[0].y) <= (this._options.threshold ?? 1.5) : true;
            if (!yOk) {
                text.unshift(t);
                break;
            }
            const xOk = t.y === row[0]?.y || !row.some(s =>  (s.x <= t?.x2 && s.x2 >= t?.x));
            if (xOk) row.push(t);
            else skipped.push(t);
        }
        text.unshift(...skipped.reverse());
        return row.sort((a, b) => a.x - b.x);
    }

}

function intersect(a: _PdfColumn, b: _PdfColumn): boolean {
    return a.x <= b.x2 && a.x2 >= b.x;
}