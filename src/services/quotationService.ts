import { Quotation, QuotationTemplate, QuotationStatus } from '../types';
import { SubscriptionService } from './subscriptionService';

const QUOTES_STORAGE_KEY = 'brightloop_quotations_v2';
const TEMPLATES_STORAGE_KEY = 'brightloop_quotation_templates_v2';

const initialTemplates: QuotationTemplate[] = [
  {
    id: 'tmpl_ent_cloud',
    name: 'Enterprise Cloud Suite Offer',
    description: 'Annual corporate bundle including BrightCore Core License with Odoo Brand Bridge, Auto-Billing Engine, and 24/7 Priority Support.',
    defaultValidityDays: 30,
    defaultNotes: 'Includes dedicated account manager, free data migration, and quarterly business reviews. Payment terms: Net 30 Days.',
    status: 'Active',
    createdAt: '2026-01-10T09:00:00Z',
    lines: [
      {
        id: 'tmpl_line_1',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        variantId: 'var_01_odoo',
        variantName: 'Odoo Connected Brand',
        planId: 'plan_ent',
        planName: 'Enterprise Cloud Pro',
        quantity: 20,
        unitPrice: 810, // 250 + 560
        taxRate: 0.18,
        taxAmount: 2916,
        discount: 1000,
        lineTotal: 18116,
      },
      {
        id: 'tmpl_line_2',
        productId: 'prod_02',
        productName: 'Auto-Billing & Invoice Engine',
        variantId: 'var_02_realtime',
        variantName: 'Real-time Webhook Streaming',
        planId: 'plan_ent',
        planName: 'Enterprise Cloud Pro',
        quantity: 1,
        unitPrice: 200,
        taxRate: 0.18,
        taxAmount: 36,
        discount: 0,
        lineTotal: 236,
      },
      {
        id: 'tmpl_line_3',
        productId: 'prod_04',
        productName: 'Dedicated 24/7 Priority Support',
        variantId: 'var_04_gold',
        variantName: 'Executive TAM + 15m SLA',
        planId: 'plan_ent',
        planName: 'Enterprise Cloud Pro',
        quantity: 1,
        unitPrice: 840,
        taxRate: 0.18,
        taxAmount: 151.2,
        discount: 100,
        lineTotal: 891.2,
      },
    ],
  },
  {
    id: 'tmpl_growth_pack',
    name: 'Growth Team Operations Bundle',
    description: 'Standard 5-user configuration with automated recurring invoicing and multi-currency tax calculation engine.',
    defaultValidityDays: 15,
    defaultNotes: 'Billed monthly on receipt. Minimum 5 seats. Includes standard 48-hr email ticketing.',
    status: 'Active',
    createdAt: '2026-01-20T11:00:00Z',
    lines: [
      {
        id: 'tmpl_line_g1',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        variantId: 'var_01_std',
        variantName: 'Standard Native Edition',
        planId: 'plan_grow',
        planName: 'Growth Team Tier',
        quantity: 5,
        unitPrice: 250,
        taxRate: 0.18,
        taxAmount: 225,
        discount: 50,
        lineTotal: 1425,
      },
      {
        id: 'tmpl_line_g2',
        productId: 'prod_02',
        productName: 'Auto-Billing & Invoice Engine',
        planId: 'plan_grow',
        planName: 'Growth Team Tier',
        quantity: 1,
        unitPrice: 120,
        taxRate: 0.18,
        taxAmount: 21.6,
        discount: 0,
        lineTotal: 141.6,
      },
    ],
  },
  {
    id: 'tmpl_pilot_test',
    name: 'Rapid Pilot Validation Pack',
    description: 'Short-term sandboxed deployment for client technical evaluation and POC trial testing.',
    defaultValidityDays: 7,
    defaultNotes: 'Pilot pricing valid for 7 days. Closes automatically on expiration date unless converted.',
    status: 'Active',
    createdAt: '2026-02-05T14:30:00Z',
    lines: [
      {
        id: 'tmpl_line_p1',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        planId: 'plan_daily_pilot',
        planName: 'Rapid Pilot Testing Engine',
        quantity: 1,
        unitPrice: 45,
        taxRate: 0.18,
        taxAmount: 8.1,
        discount: 0,
        lineTotal: 53.1,
      },
    ],
  },
];

const initialQuotations: Quotation[] = [
  {
    id: 'qt_01',
    quotationNumber: 'QT-2026-0089',
    customerId: 'cust_03',
    customerName: 'Elena Rostova',
    companyName: 'Nordic Retail Group',
    customerEmail: 'elena@nordicretail.se',
    billingAddress: 'Kungsgatan 42, 111 35 Stockholm, Sweden',
    quotationDate: '2026-10-15',
    validityDays: 30,
    validUntil: '2026-11-15',
    status: 'Sent',
    planName: 'Enterprise Cloud Pro',
    notes: 'Custom multi-brand retail suite integration offer valid for 30 days.',
    createdBy: 'Marcus Vance',
    createdAt: '2026-10-15T10:00:00Z',
    subtotal: 38200,
    taxTotal: 6876,
    discountTotal: 1276,
    totalAmount: 43800,
    items: [
      {
        id: 'qi_01',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        variantId: 'var_01_odoo',
        variantName: 'Odoo Connected Brand',
        planId: 'plan_ent',
        planName: 'Enterprise Cloud Pro',
        quantity: 40,
        unitPrice: 810,
        taxRate: 0.18,
        taxAmount: 5832,
        discount: 1000,
        lineTotal: 37232,
      },
      {
        id: 'qi_02',
        productId: 'prod_02',
        productName: 'Auto-Billing & Invoice Engine',
        planId: 'plan_ent',
        planName: 'Enterprise Cloud Pro',
        quantity: 1,
        unitPrice: 200,
        taxRate: 0.18,
        taxAmount: 36,
        discount: 0,
        lineTotal: 236,
      },
    ],
  },
  {
    id: 'qt_02',
    quotationNumber: 'QT-2026-0088',
    customerId: 'cust_04',
    customerName: 'David Kalu',
    companyName: 'Helios Logistics',
    customerEmail: 'dkalu@helios-logistics.com',
    billingAddress: '782 Industrial Blvd, Dallas, TX 75201, USA',
    quotationDate: '2026-10-26',
    validityDays: 15,
    validUntil: '2026-11-10',
    status: 'Draft',
    planName: 'Starter Business Ops',
    notes: 'Starter deployment for logistics dispatch operations.',
    createdBy: 'Alex Mercer',
    createdAt: '2026-10-26T14:20:00Z',
    subtotal: 3000,
    taxTotal: 540,
    discountTotal: 60,
    totalAmount: 3480,
    items: [
      {
        id: 'qi_03',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        variantId: 'var_01_std',
        variantName: 'Standard Native Edition',
        planId: 'plan_starter',
        planName: 'Starter Business Ops',
        quantity: 10,
        unitPrice: 250,
        taxRate: 0.18,
        taxAmount: 450,
        discount: 50,
        lineTotal: 2900,
      },
      {
        id: 'qi_04',
        productId: 'prod_03',
        productName: 'Multi-Currency & VAT Engine',
        planId: 'plan_starter',
        planName: 'Starter Business Ops',
        quantity: 1,
        unitPrice: 95,
        taxRate: 0.18,
        taxAmount: 17.1,
        discount: 10,
        lineTotal: 102.1,
      },
    ],
  },
  {
    id: 'qt_03',
    quotationNumber: 'QT-2026-0087',
    customerId: 'cust_05',
    customerName: 'Chloe Bennett',
    companyName: 'Pulse Biotech Labs',
    customerEmail: 'c.bennett@pulsebiotech.org',
    billingAddress: '100 BioTech Parkway, Cambridge, MA 02142, USA',
    quotationDate: '2026-10-18',
    validityDays: 14,
    validUntil: '2026-11-01',
    status: 'Accepted',
    planName: 'Growth Team Tier',
    notes: 'Approved offer ready for subscription confirmation and provisioning.',
    createdBy: 'Marcus Vance',
    createdAt: '2026-10-18T16:00:00Z',
    subtotal: 9800,
    taxTotal: 1764,
    discountTotal: 314,
    totalAmount: 11250,
    items: [
      {
        id: 'qi_05',
        productId: 'prod_01',
        productName: 'BrightCore Core License',
        planId: 'plan_grow',
        planName: 'Growth Team Tier',
        quantity: 12,
        unitPrice: 250,
        taxRate: 0.18,
        taxAmount: 540,
        discount: 200,
        lineTotal: 3340,
      },
    ],
  },
  {
    id: 'qt_04',
    quotationNumber: 'QT-2026-0086',
    customerId: 'cust_01',
    customerName: 'Sarah Jenkins',
    companyName: 'Vertex Logic Inc.',
    customerEmail: 's.jenkins@vertexlogic.com',
    billingAddress: '400 Valley View Way, San Jose, CA 95110, USA',
    quotationDate: '2026-10-01',
    validityDays: 30,
    validUntil: '2026-10-31',
    status: 'Converted',
    planName: 'Enterprise Cloud Pro',
    convertedSubscriptionId: 'sub_01',
    notes: 'Converted to annual contract #SUB-2026-1092.',
    createdBy: 'Alex Mercer',
    createdAt: '2026-10-01T09:00:00Z',
    subtotal: 25000,
    taxTotal: 4500,
    discountTotal: 700,
    totalAmount: 28800,
    items: [],
  },
];

export class QuotationService {
  // --- Quotations Management ---

  public static getQuotations(): Quotation[] {
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(initialQuotations));
      return initialQuotations;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialQuotations;
    }
  }

  private static saveQuotations(quotes: Quotation[]): void {
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
  }

  public static getQuotationById(id: string): Quotation | undefined {
    return this.getQuotations().find((q) => q.id === id);
  }

  public static createQuotation(data: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt'>): Quotation {
    const quotes = this.getQuotations();
    const nextNumber = `QT-2026-0${(90 + quotes.length).toString().padStart(3, '0')}`;

    const newQuotation: Quotation = {
      ...data,
      id: `qt_${Date.now()}`,
      quotationNumber: nextNumber,
      createdAt: new Date().toISOString(),
    };

    quotes.unshift(newQuotation);
    this.saveQuotations(quotes);
    return newQuotation;
  }

  public static updateQuotation(id: string, updates: Partial<Quotation>): Quotation {
    const quotes = this.getQuotations();
    const index = quotes.findIndex((q) => q.id === id);
    if (index === -1) throw new Error('Quotation not found.');

    quotes[index] = {
      ...quotes[index],
      ...updates,
    };

    this.saveQuotations(quotes);
    return quotes[index];
  }

  public static deleteQuotation(id: string): void {
    const quotes = this.getQuotations();
    const target = quotes.find((q) => q.id === id);
    if (!target) throw new Error('Quotation not found.');

    if (target.status !== 'Draft') {
      throw new Error('Only quotations in "Draft" status can be deleted.');
    }

    const filtered = quotes.filter((q) => q.id !== id);
    this.saveQuotations(filtered);
  }

  public static updateStatus(id: string, status: QuotationStatus): Quotation {
    return this.updateQuotation(id, { status });
  }

  public static convertToSubscription(quotationId: string): {
    quotation: Quotation;
    subscription: ReturnType<typeof SubscriptionService.createSubscriptionFromQuotation>;
  } {
    const quote = this.getQuotationById(quotationId);
    if (!quote) throw new Error('Quotation not found.');

    if (quote.status === 'Converted') {
      throw new Error('This quotation has already been converted to an active subscription.');
    }

    // Provision subscription
    const subscription = SubscriptionService.createSubscriptionFromQuotation(quote);

    // Update quotation status
    const updatedQuote = this.updateQuotation(quotationId, {
      status: 'Converted',
      convertedSubscriptionId: subscription.id,
    });

    return { quotation: updatedQuote, subscription };
  }

  // --- Quotation Templates Management ---

  public static getTemplates(): QuotationTemplate[] {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(initialTemplates));
      return initialTemplates;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialTemplates;
    }
  }

  private static saveTemplates(templates: QuotationTemplate[]): void {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  }

  public static getTemplateById(id: string): QuotationTemplate | undefined {
    return this.getTemplates().find((t) => t.id === id);
  }

  public static createTemplate(data: Omit<QuotationTemplate, 'id' | 'createdAt'>): QuotationTemplate {
    const templates = this.getTemplates();
    const newTemplate: QuotationTemplate = {
      ...data,
      id: `tmpl_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    templates.unshift(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  public static updateTemplate(id: string, updates: Partial<QuotationTemplate>): QuotationTemplate {
    const templates = this.getTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Template not found.');

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveTemplates(templates);
    return templates[index];
  }

  public static deleteTemplate(id: string): void {
    const templates = this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    this.saveTemplates(filtered);
  }

  public static duplicateTemplate(id: string): QuotationTemplate {
    const template = this.getTemplateById(id);
    if (!template) throw new Error('Template not found.');

    return this.createTemplate({
      name: `${template.name} (Copy)`,
      description: template.description,
      defaultValidityDays: template.defaultValidityDays,
      defaultNotes: template.defaultNotes,
      status: 'Active',
      lines: JSON.parse(JSON.stringify(template.lines)),
    });
  }

  public static toggleTemplateStatus(id: string): QuotationTemplate {
    const templates = this.getTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Template not found.');

    templates[index].status = templates[index].status === 'Active' ? 'Inactive' : 'Active';
    templates[index].updatedAt = new Date().toISOString();
    this.saveTemplates(templates);
    return templates[index];
  }
}
