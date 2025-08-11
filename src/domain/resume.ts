export interface PdfDocument {
  _id: string;          // string used like _id
  tipo: string;
  file: Buffer;
  uploadedAt: Date;
}

