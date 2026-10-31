export interface CompanyProfile {
  companyName: string;
  taxId: string;
  billingEmail: string;
  supportPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  defaultCurrency: string;
  defaultPaymentTerms: string;
  invoicePrefix: string;
  fiscalYearStart: string;
}

export interface BillingRules {
  invoiceGenerationDaysBefore: number; // e.g. 7 days before renewal
  paymentGracePeriodDays: number; // e.g. 15 days before overdue
  autoRetryFailedPayments: boolean;
  maxRetryAttempts: number;
  autoApplyDiscounts: boolean;
  cancelSubscriptionOnOverdueDays: number;
  sendAutomaticReceipts: boolean;
}

export interface SecurityPolicies {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpirationDays: number; // 0 for never
  sessionTimeoutMinutes: number; // e.g. 30, 60, 120
  maxFailedLogins: number;
  lockoutDurationMinutes: number;
  mfaEnforcement: 'optional' | 'staff_admin' | 'all';
  enforceSingleActiveSession: boolean;
}

export interface NotificationSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  notifyOnNewInvoice: boolean;
  notifyOnInvoiceReminder: boolean;
  notifyOnPaymentSuccess: boolean;
  notifyOnPaymentFailed: boolean;
  notifyOnSubscriptionRenewed: boolean;
  notifyOnSubscriptionPaused: boolean;
  notifyOnSubscriptionClosed: boolean;
  notifyOnUpcomingRenewal: boolean;
  notifyOnOverdueDunning: boolean;
  notifyInternalFinanceDigest: boolean;
  attachInvoicePdf: boolean;
}

const STORAGE_KEYS = {
  COMPANY: 'brightloop_company_profile_v2',
  BILLING_RULES: 'brightloop_billing_rules_v2',
  SECURITY: 'brightloop_security_policies_v2',
  NOTIFICATIONS: 'brightloop_notification_settings_v2',
};

const DEFAULT_COMPANY: CompanyProfile = {
  companyName: 'Brightloop Software Ltd.',
  taxId: 'US-TAX-8921820',
  billingEmail: 'billing@brightloop.io',
  supportPhone: '+1 (555) 019-2834',
  address: '100 Innovation Way, Suite 400',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94107',
  country: 'United States',
  defaultCurrency: 'USD',
  defaultPaymentTerms: 'net15',
  invoicePrefix: 'INV-2026',
  fiscalYearStart: 'January',
};

const DEFAULT_BILLING_RULES: BillingRules = {
  invoiceGenerationDaysBefore: 7,
  paymentGracePeriodDays: 15,
  autoRetryFailedPayments: true,
  maxRetryAttempts: 3,
  autoApplyDiscounts: true,
  cancelSubscriptionOnOverdueDays: 45,
  sendAutomaticReceipts: true,
};

const DEFAULT_SECURITY: SecurityPolicies = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  passwordExpirationDays: 90,
  sessionTimeoutMinutes: 60,
  maxFailedLogins: 5,
  lockoutDurationMinutes: 15,
  mfaEnforcement: 'staff_admin',
  enforceSingleActiveSession: false,
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  senderName: 'Brightloop Billing Operations',
  senderEmail: 'notifications@brightloop.io',
  replyToEmail: 'support@brightloop.io',
  notifyOnNewInvoice: true,
  notifyOnInvoiceReminder: true,
  notifyOnPaymentSuccess: true,
  notifyOnPaymentFailed: true,
  notifyOnSubscriptionRenewed: true,
  notifyOnSubscriptionPaused: true,
  notifyOnSubscriptionClosed: true,
  notifyOnUpcomingRenewal: true,
  notifyOnOverdueDunning: true,
  notifyInternalFinanceDigest: true,
  attachInvoicePdf: true,
};

export class SettingsService {
  // 1. Company Profile
  public static getCompanyProfile(): CompanyProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(DEFAULT_COMPANY));
      return DEFAULT_COMPANY;
    }
    try {
      return { ...DEFAULT_COMPANY, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_COMPANY;
    }
  }

  public static saveCompanyProfile(profile: CompanyProfile): CompanyProfile {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(profile));
    return profile;
  }

  // 2. Billing Rules
  public static getBillingRules(): BillingRules {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLING_RULES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BILLING_RULES, JSON.stringify(DEFAULT_BILLING_RULES));
      return DEFAULT_BILLING_RULES;
    }
    try {
      return { ...DEFAULT_BILLING_RULES, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_BILLING_RULES;
    }
  }

  public static saveBillingRules(rules: BillingRules): BillingRules {
    localStorage.setItem(STORAGE_KEYS.BILLING_RULES, JSON.stringify(rules));
    return rules;
  }

  // 3. Security Policies
  public static getSecurityPolicies(): SecurityPolicies {
    const raw = localStorage.getItem(STORAGE_KEYS.SECURITY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(DEFAULT_SECURITY));
      return DEFAULT_SECURITY;
    }
    try {
      return { ...DEFAULT_SECURITY, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SECURITY;
    }
  }

  public static saveSecurityPolicies(policies: SecurityPolicies): SecurityPolicies {
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(policies));
    return policies;
  }

  // 4. Notifications
  public static getNotificationSettings(): NotificationSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    try {
      return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }

  public static saveNotificationSettings(settings: NotificationSettings): NotificationSettings {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(settings));
    return settings;
  }
}
