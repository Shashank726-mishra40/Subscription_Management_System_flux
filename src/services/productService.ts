import { Product, ProductVariant } from '../types';

const PRODUCTS_STORAGE_KEY = 'brightloop_products_v2';

const initialProducts: Product[] = [
  {
    id: 'prod_01',
    name: 'BrightCore Core License',
    sku: 'BC-CORE-001',
    type: 'Software License',
    salesPrice: 250,
    costPrice: 40,
    description: 'Foundational multi-user enterprise operating platform with automated license provisioning and role enforcement.',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
    status: 'Active',
    createdAt: '2026-01-15T08:00:00Z',
    variants: [
      {
        id: 'var_01_std',
        name: 'Standard Native Edition',
        sku: 'BC-CORE-STD',
        priceAdjustment: 0,
        costAdjustment: 0,
        status: 'Active',
      },
      {
        id: 'var_01_odoo',
        name: 'Odoo Connected Brand',
        sku: 'BC-CORE-ODOO',
        priceAdjustment: 560, // Exactly as highlighted in prompt: choosing Odoo brand adds 560 to the price
        costAdjustment: 80,
        status: 'Active',
      },
      {
        id: 'var_01_sap',
        name: 'SAP Enterprise Bridge',
        sku: 'BC-CORE-SAP',
        priceAdjustment: 920,
        costAdjustment: 150,
        status: 'Active',
      },
    ],
  },
  {
    id: 'prod_02',
    name: 'Auto-Billing & Invoice Engine',
    sku: 'BC-ADD-BILL',
    type: 'Add-on',
    salesPrice: 120,
    costPrice: 18,
    description: 'Recurring automated invoicing, payment reminders, direct-debit batch processing, and dunning workflows.',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=120&q=80',
    status: 'Active',
    createdAt: '2026-02-01T10:30:00Z',
    variants: [
      {
        id: 'var_02_std',
        name: 'Standard Monthly Batch',
        sku: 'BC-BILL-MO',
        priceAdjustment: 0,
        status: 'Active',
      },
      {
        id: 'var_02_realtime',
        name: 'Real-time Webhook Streaming',
        sku: 'BC-BILL-RT',
        priceAdjustment: 80,
        status: 'Active',
      },
    ],
  },
  {
    id: 'prod_03',
    name: 'Multi-Currency & VAT Engine',
    sku: 'BC-ADD-TAX',
    type: 'Add-on',
    salesPrice: 95,
    costPrice: 12,
    description: 'Dynamic local tax calculations, European reverse charge VAT rules, and live cross-border currency conversion.',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=120&q=80',
    status: 'Active',
    createdAt: '2026-02-15T14:00:00Z',
    variants: [
      {
        id: 'var_03_global',
        name: 'Global Multi-Region (140+ Currencies)',
        sku: 'BC-TAX-GLO',
        priceAdjustment: 0,
        status: 'Active',
      },
    ],
  },
  {
    id: 'prod_04',
    name: 'Dedicated 24/7 Priority Support',
    sku: 'BC-SUPP-247',
    type: 'Support',
    salesPrice: 490,
    costPrice: 150,
    description: 'SLA 15-minute response time guarantee with dedicated Technical Account Manager and hotline routing.',
    imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=120&q=80',
    status: 'Active',
    createdAt: '2026-03-01T09:15:00Z',
    variants: [
      {
        id: 'var_04_silver',
        name: 'Standard 24/7 Hotline',
        sku: 'BC-SUPP-SLV',
        priceAdjustment: 0,
        status: 'Active',
      },
      {
        id: 'var_04_gold',
        name: 'Executive TAM + 15m SLA',
        sku: 'BC-SUPP-GLD',
        priceAdjustment: 350,
        status: 'Active',
      },
    ],
  },
  {
    id: 'prod_05',
    name: 'Enterprise Cloud Deployment & Consulting',
    sku: 'BC-CONS-ENT',
    type: 'Consulting',
    salesPrice: 1500,
    costPrice: 600,
    description: 'White-glove data migration, workflow customization, and single-tenant AWS/GCP architecture deployment.',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=120&q=80',
    status: 'Active',
    createdAt: '2026-03-20T11:45:00Z',
    variants: [],
  },
  {
    id: 'prod_06',
    name: 'Security & SOC2 Audit Compliance Pack',
    sku: 'BC-ADD-SEC',
    type: 'Add-on',
    salesPrice: 320,
    costPrice: 45,
    description: 'Full immutable audit log export, SAML 2.0 / Okta SSO integration, and automated vulnerability attestations.',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=120&q=80',
    status: 'Inactive',
    createdAt: '2026-04-10T16:20:00Z',
    variants: [
      {
        id: 'var_06_std',
        name: 'Annual Audit Certificate',
        sku: 'BC-SEC-ANN',
        priceAdjustment: 0,
        status: 'Active',
      },
    ],
  },
];

export class ProductService {
  public static getProducts(): Product[] {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(initialProducts));
      return initialProducts;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialProducts;
    }
  }

  private static saveProducts(products: Product[]): void {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }

  public static getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public static createProduct(data: {
    name: string;
    sku?: string;
    type: Product['type'];
    salesPrice: number;
    costPrice: number;
    description: string;
    imageUrl?: string;
    status: 'Active' | 'Inactive' | 'Archived';
    variants?: ProductVariant[];
  }): Product {
    const products = this.getProducts();

    if (!data.name.trim()) throw new Error('Product name is required.');
    if (data.salesPrice < 0) throw new Error('Sales price cannot be negative.');
    if (data.costPrice < 0) throw new Error('Cost price cannot be negative.');
    if (!data.type) throw new Error('Product type is required.');

    const newSku =
      data.sku?.trim() ||
      `BC-${data.type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: data.name.trim(),
      sku: newSku,
      type: data.type,
      salesPrice: Number(data.salesPrice),
      costPrice: Number(data.costPrice),
      description: data.description.trim(),
      imageUrl: data.imageUrl?.trim() || undefined,
      status: data.status,
      variants: data.variants || [],
      createdAt: new Date().toISOString(),
    };

    products.unshift(newProduct);
    this.saveProducts(products);
    return newProduct;
  }

  public static updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>
  ): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('Product name cannot be empty.');
    }
    if (updates.salesPrice !== undefined && updates.salesPrice < 0) {
      throw new Error('Sales price cannot be negative.');
    }
    if (updates.costPrice !== undefined && updates.costPrice < 0) {
      throw new Error('Cost price cannot be negative.');
    }

    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveProducts(products);
    return products[index];
  }

  public static deleteProduct(id: string): void {
    const products = this.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    this.saveProducts(filtered);
  }

  public static toggleProductStatus(id: string): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found.');

    products[index].status = products[index].status === 'Active' ? 'Inactive' : 'Active';
    products[index].updatedAt = new Date().toISOString();

    this.saveProducts(products);
    return products[index];
  }

  // --- Variants Management ---

  public static addVariant(
    productId: string,
    variantData: {
      name: string;
      sku?: string;
      priceAdjustment: number;
      costAdjustment?: number;
    }
  ): Product {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found.');

    if (!variantData.name.trim()) throw new Error('Variant name is required.');

    const newVariant: ProductVariant = {
      id: `var_${Date.now()}`,
      name: variantData.name.trim(),
      sku: variantData.sku?.trim() || `${product.sku}-VAR-${(product.variants.length + 1).toString().padStart(2, '0')}`,
      priceAdjustment: Number(variantData.priceAdjustment) || 0,
      costAdjustment: Number(variantData.costAdjustment) || 0,
      status: 'Active',
    };

    product.variants.push(newVariant);
    product.updatedAt = new Date().toISOString();
    this.saveProducts(products);
    return product;
  }

  public static updateVariant(
    productId: string,
    variantId: string,
    updates: Partial<Omit<ProductVariant, 'id'>>
  ): Product {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found.');

    const vIndex = product.variants.findIndex((v) => v.id === variantId);
    if (vIndex === -1) throw new Error('Variant not found.');

    product.variants[vIndex] = {
      ...product.variants[vIndex],
      ...updates,
    };

    product.updatedAt = new Date().toISOString();
    this.saveProducts(products);
    return product;
  }

  public static deleteVariant(productId: string, variantId: string): Product {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found.');

    product.variants = product.variants.filter((v) => v.id !== variantId);
    product.updatedAt = new Date().toISOString();
    this.saveProducts(products);
    return product;
  }
}
