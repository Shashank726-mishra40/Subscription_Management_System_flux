import { TaxRule } from '../types';
import { mockTaxRules } from './mockData';

const TAX_STORAGE_KEY = 'brightloop_tax_rules_v2';

export class TaxService {
  public static getTaxRules(): TaxRule[] {
    const raw = localStorage.getItem(TAX_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(mockTaxRules));
      return mockTaxRules;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockTaxRules;
    }
  }

  private static saveTaxRules(rules: TaxRule[]): void {
    localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(rules));
  }

  public static getTaxRuleById(id: string): TaxRule | undefined {
    return this.getTaxRules().find((r) => r.id === id);
  }

  public static createTaxRule(data: Omit<TaxRule, 'id' | 'createdAt'>): TaxRule {
    const rules = this.getTaxRules();
    const newRule: TaxRule = {
      ...data,
      id: `tax_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    rules.unshift(newRule);
    this.saveTaxRules(rules);
    return newRule;
  }

  public static updateTaxRule(id: string, updates: Partial<TaxRule>): TaxRule {
    const rules = this.getTaxRules();
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Tax rule not found.');

    rules[index] = {
      ...rules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveTaxRules(rules);
    return rules[index];
  }

  public static deleteTaxRule(id: string): void {
    const rules = this.getTaxRules();
    const filtered = rules.filter((r) => r.id !== id);
    this.saveTaxRules(filtered);
  }

  public static toggleTaxRuleStatus(id: string): TaxRule {
    const rules = this.getTaxRules();
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Tax rule not found.');

    rules[index].status = rules[index].status === 'Active' ? 'Inactive' : 'Active';
    rules[index].updatedAt = new Date().toISOString();

    this.saveTaxRules(rules);
    return rules[index];
  }

  /**
   * Automatically resolve the applicable tax rate for a given product or return the active default rule.
   */
  public static getTaxRateForProduct(productId?: string, defaultFallback = 18): number {
    const activeRules = this.getTaxRules().filter((r) => r.status === 'Active');
    if (activeRules.length === 0) return defaultFallback;

    if (productId) {
      const specificRule = activeRules.find(
        (r) => r.applicableProducts && r.applicableProducts.includes(productId)
      );
      if (specificRule) return specificRule.rate;
    }

    // Default to the first general active tax rule
    const generalRule = activeRules.find((r) => !r.applicableProducts || r.applicableProducts.length === 0);
    return generalRule ? generalRule.rate : activeRules[0].rate;
  }

  /**
   * Formula: Tax Amount = Taxable Amount * Tax Rate / 100
   */
  public static calculateTax(taxableAmount: number, taxRate: number): number {
    return Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
  }
}
