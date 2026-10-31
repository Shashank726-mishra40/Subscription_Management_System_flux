// Brightloop Software - Core Type Definitions
export * from './auth';

export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed';

export type InvoiceStatus =
  | 'Draft'
  | 'Confirmed'
  | 'Sent'
  | 'Paid'
  | 'Partially Paid'
  | 'Overdue'
  | 'Cancelled';

export type TaxType = 'VAT' | 'GST' | 'Sales Tax' | 'Corporate' | 'Custom';

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Other'
  | 'Stripe'
  | 'Direct Debit'
  | 'PayPal';

export type PaymentStatus =
  | 'Recorded'
  | 'Pending'
  | 'Failed'
  | 'Reversed'
  | 'Completed';

export type BillingCycle = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type PlanClosureType = 'auto_close' | 'renewable' | 'pauseable';

export type ProductType = 'Software License' | 'Add-on' | 'Consulting' | 'Support';

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Expired' | 'Converted';

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  customerType: 'Small Business' | 'Enterprise' | 'Startup' | 'Mid-Market';
  avatar?: string;
  createdAt: string;
  activeSubscriptionsCount: number;
  totalSpent: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  priceAdjustment: number; // e.g. +560 for Odoo Brand
  brandAdjustment?: number; // alias for compatibility
  costAdjustment?: number;
  status?: 'Active' | 'Inactive';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  type: ProductType;
  salesPrice: number;
  costPrice: number;
  variants: ProductVariant[];
  description: string;
  imageUrl?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  description?: string;
  billingCycle: BillingCycle;
  price: number;
  minQuantity: number;
  closureType: PlanClosureType;
  availableFrom: string;
  availableUntil?: string;
  isActive: boolean;
  includedProductIds?: string[];
  features?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationLineItem {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  planId?: string;
  planName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 0.18 for 18%
  taxAmount: number;
  discount: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. QT-2026-0089
  customerId: string;
  customerName: string;
  companyName: string;
  customerEmail: string;
  billingAddress?: string;
  quotationDate: string;
  validityDays: number;
  validUntil: string;
  items: QuotationLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  status: QuotationStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  convertedSubscriptionId?: string;
  planName?: string; // summary helper
  itemsCount?: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  description: string;
  defaultValidityDays: number;
  lines: QuotationLineItem[];
  defaultNotes: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionLineItem {
  id: string;
  productId: string;
  productName: string;
  variant?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 0.18 for 18%
  taxAmount: number;
  subtotal: number;
  total: number;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string; // e.g. SUB-2026-1092
  customerId: string;
  customerName: string;
  companyName: string;
  customerEmail?: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  renewalDate: string;
  billingCycle: BillingCycle;
  paymentTerms: string;
  items: SubscriptionLineItem[];
  mrrAmount: number;
  subtotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  discountCode?: string;
  totalAmount: number;
  autoRenew: boolean;
  quotationId?: string;
  quotationNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number; // percentage, e.g. 18 for 18%
  type: TaxType;
  description: string;
  applicableProducts?: string[]; // product IDs, optional
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId?: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percentage, e.g. 18
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0819
  subscriptionId?: string;
  subscriptionNumber?: string;
  customerId: string;
  customerName: string;
  companyName: string;
  customerEmail?: string;
  invoiceDate: string; // YYYY-MM-DD
  issueDate: string; // alias for display
  dueDate: string; // YYYY-MM-DD
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  billingPeriodKey?: string; // unique for duplicate prevention
  items: InvoiceLine[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  grandTotal?: number;
  paidAmount: number;
  amountDue: number;
  outstandingAmount?: number;
  status: InvoiceStatus;
  notes?: string;
  paymentTerms?: string;
  sentAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  subscriptionNumber: string;
  customerId?: string;
  customerName: string;
  companyName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billingPeriod: string;
  executionDate: string;
  status: 'Success' | 'Failed' | 'Skipped';
  errorMessage?: string;
  billedAmount?: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string; // e.g. PAY-2026-0391
  paymentReference?: string; // alias
  transactionReference: string; // UTR, Gateway TXN, Auth ID
  invoiceId: string;
  invoiceNumber: string;
  subscriptionId?: string;
  subscriptionNumber?: string;
  customerId: string;
  customerName: string;
  companyName: string;
  amount: number;
  paymentAmount?: number; // alias
  paymentDate: string;
  method: PaymentMethod;
  paymentMethod?: PaymentMethod; // alias
  status: PaymentStatus;
  paymentStatus?: PaymentStatus; // alias
  referenceNote?: string;
  notes?: string;
  recordedBy?: string;
  reversedAt?: string;
  reversedReason?: string;
  reversedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FollowUpNote {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerName?: string;
  note: string;
  actionTaken?: string;
  contactPerson?: string;
  recordedBy: string;
  createdAt: string;
}

export type DiscountType = 'fixed_amount' | 'percentage';

export interface Discount {
  id: string;
  name: string;
  description: string;
  code?: string;
  discountType: DiscountType;
  discountValue: number;
  type?: DiscountType; // alias
  value?: number; // alias
  minimumPurchase?: number;
  minPurchaseAmount?: number; // alias
  minimumPurchaseAmount?: number; // alias
  minimumQuantity?: number;
  minPurchaseQuantity?: number; // alias
  applicableProductIds?: string[];
  applicablePlanIds?: string[];
  applyToEntireSubscription: boolean;
  appliedTo?: 'all' | 'specific_products' | 'subscriptions';
  startDate: string;
  endDate: string;
  maximumUses?: number;
  usageLimit?: number; // alias
  maximumUsesPerCustomer?: number;
  usedCount: number;
  status: 'Active' | 'Inactive';
  isActive?: boolean; // alias
  createdAt: string;
  updatedAt?: string;
}

export type DiscountRule = Discount;

export interface DiscountUsage {
  id: string;
  discountId: string;
  discountName: string;
  discountCode?: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  subscriptionId?: string;
  subscriptionNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedAt: string;
  status: 'Applied' | 'Reversed' | 'Failed';
}

export interface DiscountApplication {
  id: string;
  discountId: string;
  subscriptionId?: string;
  productId?: string;
  invoiceId?: string;
  discountAmount: number;
  applicationType: 'product' | 'subscription';
  createdAt: string;
}

export interface DashboardMetricSummary {
  totalCustomers: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  activeSubscriptions: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  mrr: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  totalRevenue: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  outstandingPayments: {
    value: number;
    trend: number;
    isPositive: boolean;
  };
  overdueInvoices: {
    value: number;
    count: number;
    trend: number;
    isPositive: boolean;
  };
}

export interface RevenueDataPoint {
  month: string;
  recurring: number;
  newSales: number;
  total: number;
}

export interface GrowthDataPoint {
  month: string;
  active: number;
  churned: number;
  netNew: number;
}

export interface PaymentStatusDataPoint {
  status: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}
