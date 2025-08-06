export interface PdfDocument {
  _id: string;          // la tua stringa usata come _id
  tipo: string;
  file: Buffer;
  uploadedAt: Date;
}