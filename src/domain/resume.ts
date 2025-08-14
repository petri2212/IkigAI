export interface PdfDocument {
  id: string;          // string used like _id
  tipo: string;
  session: string;
  file: Buffer;
  uploadedAt: Date;
}

