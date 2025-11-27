export interface ArchivedSale {
  id: string;
  clientId: string;
  saleNumber: string;
  saleDate: string;
  sellerName: string | null;
  totalAmount: number;
  paidAmount: number;
  sourceDocument: string;
  importedAt: string;
  items: ArchivedSaleItem[];
  payments: ArchivedPayment[];
}

export interface ArchivedSaleItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ArchivedPayment {
  id: string;
  paymentMethod: string;
  amount: number;
  paymentDate: string;
  sourceDocument: string;
}

export interface ArchivedSalesSummary {
  totalSales: number;
  totalAmount: number;
  totalPaid: number;
  yearBreakdown: Array<{
    year: number;
    salesCount: number;
    totalAmount: number;
  }>;
}

export interface PaginatedArchivedSales {
  data: ArchivedSale[];
  total: number;
  page: number;
  limit: number;
}
