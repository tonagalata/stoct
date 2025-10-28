export type Card = {
  id: string;          // uuid v4
  brand: string;       // required
  number: string;      // required
  pin?: string;        // optional
  notes?: string;      // optional
  barcodeType?: 'qr' | 'code128'; // placeholder; not rendered yet
  createdAt: number;
  updatedAt: number;
};

export type CardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;

export type ExportData = {
  version: number;
  cards: Card[];
};
