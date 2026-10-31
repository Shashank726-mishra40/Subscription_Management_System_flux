import { Customer } from '../types';
import { mockRecentCustomers } from './mockData';

const CUSTOMERS_STORAGE_KEY = 'brightloop_customers_v2';

export class CustomerService {
  public static getCustomers(): Customer[] {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(mockRecentCustomers));
      return mockRecentCustomers;
    }
    try {
      const parsed: Customer[] = JSON.parse(raw);
      // Sync in-memory mockRecentCustomers array so components reading it directly stay in sync
      mockRecentCustomers.length = 0;
      mockRecentCustomers.push(...parsed);
      return parsed;
    } catch {
      return mockRecentCustomers;
    }
  }

  private static saveCustomers(customers: Customer[]): void {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
    // Keep in-memory mockRecentCustomers in sync
    mockRecentCustomers.length = 0;
    mockRecentCustomers.push(...customers);
  }

  public static getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public static createCustomer(
    data: Omit<Customer, 'id' | 'createdAt' | 'activeSubscriptionsCount' | 'totalSpent'> & {
      activeSubscriptionsCount?: number;
      totalSpent?: number;
    }
  ): Customer {
    const customers = this.getCustomers();

    // Check email uniqueness
    const exists = customers.some(
      (c) => c.email.toLowerCase() === data.email.toLowerCase().trim()
    );
    if (exists) {
      throw new Error(`A customer with email "${data.email}" already exists.`);
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: data.name.trim(),
      companyName: data.companyName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      customerType: data.customerType,
      createdAt: new Date().toISOString().split('T')[0],
      activeSubscriptionsCount: data.activeSubscriptionsCount || 0,
      totalSpent: data.totalSpent || 0,
    };

    customers.unshift(newCustomer);
    this.saveCustomers(customers);
    return newCustomer;
  }

  public static updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Customer not found.');
    }

    // Check email uniqueness if email is changed
    if (updates.email && updates.email.toLowerCase() !== customers[index].email.toLowerCase()) {
      const emailExists = customers.some(
        (c) => c.id !== id && c.email.toLowerCase() === updates.email!.toLowerCase().trim()
      );
      if (emailExists) {
        throw new Error(`A customer with email "${updates.email}" already exists.`);
      }
    }

    customers[index] = {
      ...customers[index],
      ...updates,
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.companyName && { companyName: updates.companyName.trim() }),
      ...(updates.email && { email: updates.email.toLowerCase().trim() }),
      ...(updates.phone && { phone: updates.phone.trim() }),
    };

    this.saveCustomers(customers);
    return customers[index];
  }

  public static deleteCustomer(id: string): void {
    const customers = this.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    this.saveCustomers(filtered);
  }
}
