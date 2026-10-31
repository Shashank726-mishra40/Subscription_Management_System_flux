import { Plan, BillingCycle, PlanClosureType } from '../types';

const PLANS_STORAGE_KEY = 'brightloop_plans_v2';

const initialPlans: Plan[] = [
  {
    id: 'plan_starter',
    name: 'Starter Business Ops',
    code: 'PLAN-STR-01',
    description: 'Essential billing and single-tier license execution for growing businesses.',
    billingCycle: 'monthly',
    price: 290,
    minQuantity: 1,
    closureType: 'renewable',
    availableFrom: '2026-01-01',
    isActive: true,
    features: [
      'Core License Access',
      'Automated Invoicing Engine',
      'Email Billing Reminders',
      'Standard 48-hr SLA Support',
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_grow',
    name: 'Growth Team Tier',
    code: 'PLAN-GRW-02',
    description: 'Scalable subscription workflow with integrated multi-currency and regional tax calculation.',
    billingCycle: 'monthly',
    price: 750,
    minQuantity: 5,
    closureType: 'renewable',
    availableFrom: '2026-01-01',
    isActive: true,
    features: [
      'Multi-seat Management (min 5)',
      'Multi-currency & VAT Module',
      'Direct Debit & Stripe Billing',
      'Dedicated 24/7 Hotline Support',
      'Exportable Audit Packets',
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_ent',
    name: 'Enterprise Cloud Pro',
    code: 'PLAN-ENT-03',
    description: 'Annual corporate master contract with flexible pause, brand variant additions, and dedicated TAM.',
    billingCycle: 'yearly',
    price: 28800,
    minQuantity: 20,
    closureType: 'pauseable',
    availableFrom: '2026-01-01',
    isActive: true,
    features: [
      'Unlimited Workflow Scalability',
      'Custom Brand Variant Integrations (e.g. Odoo)',
      'Contract Mid-term Pause & Early Close Privileges',
      'Executive Account Manager with 15m SLA',
      'Custom Automated Tax Rules & White-label Invoicing',
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_daily_pilot',
    name: 'Rapid Pilot Testing Engine',
    code: 'PLAN-PLT-04',
    description: 'Short-term sandboxed deployment for client validation and trial migrations.',
    billingCycle: 'daily',
    price: 45,
    minQuantity: 1,
    closureType: 'auto_close',
    availableFrom: '2026-06-01',
    availableUntil: '2026-12-31',
    isActive: true,
    features: [
      'Daily Metered Settlement',
      'Auto-close at Expiration Date',
      'Full Sandbox Data Export',
    ],
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'plan_weekly_sprint',
    name: 'High-Velocity Weekly Sprint Tier',
    code: 'PLAN-WKS-05',
    description: 'Weekly flexible licensing for contracted consultancy projects and seasonal team ramps.',
    billingCycle: 'weekly',
    price: 180,
    minQuantity: 3,
    closureType: 'renewable',
    availableFrom: '2026-03-01',
    isActive: true,
    features: [
      'Weekly Billing Reconciliation',
      'Fast Seat Spin-up & Teardown',
      'Automated Weekly PDF Invoicing',
    ],
    createdAt: '2026-03-01T00:00:00Z',
  },
];

export class PlanService {
  public static getPlans(): Plan[] {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(initialPlans));
      return initialPlans;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialPlans;
    }
  }

  private static savePlans(plans: Plan[]): void {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  }

  public static getPlanById(id: string): Plan | undefined {
    return this.getPlans().find((p) => p.id === id);
  }

  public static createPlan(data: {
    name: string;
    code?: string;
    description?: string;
    billingCycle: BillingCycle;
    price: number;
    minQuantity: number;
    closureType: PlanClosureType;
    availableFrom: string;
    availableUntil?: string;
    isActive: boolean;
    features?: string[];
  }): Plan {
    const plans = this.getPlans();

    if (!data.name.trim()) throw new Error('Plan name is required.');
    if (data.price < 0) throw new Error('Price cannot be negative.');
    if (data.minQuantity < 1) throw new Error('Minimum quantity must be at least 1.');
    if (!data.availableFrom) throw new Error('Start date is required.');

    const newCode =
      data.code?.trim() ||
      `PLAN-${data.billingCycle.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      name: data.name.trim(),
      code: newCode,
      description: data.description?.trim(),
      billingCycle: data.billingCycle,
      price: Number(data.price),
      minQuantity: Number(data.minQuantity),
      closureType: data.closureType,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil || undefined,
      isActive: data.isActive,
      features: data.features || [],
      createdAt: new Date().toISOString(),
    };

    plans.unshift(newPlan);
    this.savePlans(plans);
    return newPlan;
  }

  public static updatePlan(
    id: string,
    updates: Partial<Omit<Plan, 'id' | 'createdAt'>>
  ): Plan {
    const plans = this.getPlans();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Plan not found.');

    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('Plan name cannot be empty.');
    }
    if (updates.price !== undefined && updates.price < 0) {
      throw new Error('Price cannot be negative.');
    }
    if (updates.minQuantity !== undefined && updates.minQuantity < 1) {
      throw new Error('Minimum quantity must be at least 1.');
    }

    plans[index] = {
      ...plans[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.savePlans(plans);
    return plans[index];
  }

  public static deletePlan(id: string): void {
    const plans = this.getPlans();
    const filtered = plans.filter((p) => p.id !== id);
    this.savePlans(filtered);
  }

  public static togglePlanStatus(id: string): Plan {
    const plans = this.getPlans();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Plan not found.');

    plans[index].isActive = !plans[index].isActive;
    plans[index].updatedAt = new Date().toISOString();

    this.savePlans(plans);
    return plans[index];
  }
}
