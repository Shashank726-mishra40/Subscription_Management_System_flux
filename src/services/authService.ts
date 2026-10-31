import { User, AuthSession, PasswordResetToken } from '../types/auth';
import { generateSalt, hashPassword, generateSecureToken, validatePassword } from '../utils/crypto';

const USERS_STORAGE_KEY = 'brightloop_users_v2';
const SESSION_STORAGE_KEY = 'brightloop_auth_session_v2';
const TOKENS_STORAGE_KEY = 'brightloop_reset_tokens_v2';
const MOCK_EMAILS_KEY = 'brightloop_simulated_emails_v2';

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  previewUrl: string;
  sentAt: string;
  expiresInMinutes: number;
}

// Default Seed Accounts
const DEFAULT_SALT = 'e7b1a4f89d3c2e10';

const seedInitialUsers = async (): Promise<User[]> => {
  const adminHash = await hashPassword('AdminPassword123!', DEFAULT_SALT);
  const staffHash = await hashPassword('StaffPassword123!', DEFAULT_SALT);
  const customerHash = await hashPassword('CustomerPassword123!', DEFAULT_SALT);

  return [
    {
      id: 'usr_admin_01',
      name: 'Alex Mercer',
      email: 'admin@brightloop.io',
      passwordHash: adminHash,
      salt: DEFAULT_SALT,
      role: 'ADMIN',
      title: 'VP of Finance & System Admin',
      department: 'Executive Operations',
      phone: '+1 (555) 019-2834',
      status: 'Active',
      createdAt: '2026-01-15T09:00:00Z',
      lastLoginAt: new Date().toISOString(),
      permissions: ['ALL_ACCESS'],
    },
    {
      id: 'usr_staff_01',
      name: 'Marcus Vance',
      email: 'staff@brightloop.io',
      passwordHash: staffHash,
      salt: DEFAULT_SALT,
      role: 'STAFF',
      title: 'Senior Billing & Customer Ops Lead',
      department: 'Finance & Customer Operations',
      phone: '+1 (555) 482-9012',
      status: 'Active',
      createdAt: '2026-02-10T11:30:00Z',
      lastLoginAt: '2026-10-30T16:45:00Z',
      permissions: [
        'MANAGE_CUSTOMERS',
        'MANAGE_QUOTATIONS',
        'MANAGE_SUBSCRIPTIONS',
        'MANAGE_INVOICES',
        'RECORD_PAYMENTS',
        'VIEW_REPORTS',
      ],
    },
    {
      id: 'usr_staff_02',
      name: 'Elena Rostova',
      email: 'elena.staff@brightloop.io',
      passwordHash: staffHash,
      salt: DEFAULT_SALT,
      role: 'STAFF',
      title: 'Customer Accounts Specialist',
      department: 'Customer Success',
      phone: '+1 (555) 773-1940',
      status: 'Active',
      createdAt: '2026-03-01T10:00:00Z',
      lastLoginAt: '2026-10-29T14:15:00Z',
      permissions: [
        'MANAGE_CUSTOMERS',
        'MANAGE_SUBSCRIPTIONS',
        'VIEW_INVOICES',
      ],
    },
    {
      id: 'usr_cust_01',
      name: 'Sarah Jenkins',
      email: 'customer@vertexlogic.com',
      passwordHash: customerHash,
      salt: DEFAULT_SALT,
      role: 'CUSTOMER',
      companyName: 'Vertex Logic Inc.',
      customerId: 'cust_01',
      phone: '+1 (555) 349-8102',
      status: 'Active',
      createdAt: '2026-04-12T08:20:00Z',
      lastLoginAt: '2026-10-31T09:12:00Z',
    },
  ];
};

export class AuthService {
  private static async getUsers(): Promise<User[]> {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const seeded = await seedInitialUsers();
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  }

  private static saveUsers(users: User[]): void {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private static getTokens(): PasswordResetToken[] {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private static saveTokens(tokens: PasswordResetToken[]): void {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  }

  // --- Authentication Methods ---

  public static async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ user: User; session: AuthSession }> {
    const users = await this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    if (user.status !== 'Active') {
      throw new Error(
        'This account is currently deactivated. Please contact your system administrator.'
      );
    }

    const inputHash = await hashPassword(password, user.salt);
    if (inputHash !== user.passwordHash) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    this.saveUsers(users);

    const session: AuthSession = {
      user,
      token: generateSecureToken(24),
      expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
      rememberMe,
    };

    if (rememberMe) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    return { user, session };
  }

  public static async signup(
    name: string,
    email: string,
    password: string,
    companyName?: string
  ): Promise<{ user: User; session: AuthSession }> {
    const users = await this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Email uniqueness check
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    // 2. Password validation check
    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      throw new Error(pwCheck.errorMessage || 'Invalid password format.');
    }

    // 3. New registrations strictly receive CUSTOMER role
    const salt = generateSalt(16);
    const passwordHash = await hashPassword(password, salt);
    const newCustomerId = `cust_${Date.now()}`;

    const newUser: User = {
      id: `usr_cust_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      role: 'CUSTOMER', // Enforced
      companyName: companyName?.trim() || `${name.trim()}'s Organization`,
      customerId: newCustomerId,
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto-login session
    const session: AuthSession = {
      user: newUser,
      token: generateSecureToken(24),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      rememberMe: false,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    return { user: newUser, session };
  }

  public static getCurrentSession(): AuthSession | null {
    // Check localStorage first (remember me), then sessionStorage
    const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (localRaw) {
      const parsed: AuthSession = JSON.parse(localRaw);
      if (parsed.expiresAt > Date.now()) return parsed;
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionRaw) {
      const parsed: AuthSession = JSON.parse(sessionRaw);
      if (parsed.expiresAt > Date.now()) return parsed;
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    return null;
  }

  public static logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  // --- Password Recovery Workflow ---

  public static async requestPasswordReset(
    email: string
  ): Promise<{ token: string; simulatedEmail: SimulatedEmail }> {
    const users = await this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('No registered account was found with that email address.');
    }

    const token = generateSecureToken(32);
    const expiresInMinutes = 15;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

    const resetTokenRecord: PasswordResetToken = {
      token,
      email: normalizedEmail,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    };

    const tokens = this.getTokens();
    tokens.push(resetTokenRecord);
    this.saveTokens(tokens);

    // Record simulated email for instant verification and demo
    const simulatedEmail: SimulatedEmail = {
      id: `mail_${Date.now()}`,
      to: normalizedEmail,
      subject: 'Reset your Brightloop Software password',
      previewUrl: `/reset-password?token=${token}`,
      sentAt: new Date().toLocaleTimeString(),
      expiresInMinutes,
    };

    const existingEmailsRaw = localStorage.getItem(MOCK_EMAILS_KEY);
    const existingEmails: SimulatedEmail[] = existingEmailsRaw ? JSON.parse(existingEmailsRaw) : [];
    existingEmails.unshift(simulatedEmail);
    localStorage.setItem(MOCK_EMAILS_KEY, JSON.stringify(existingEmails.slice(0, 10)));

    return { token, simulatedEmail };
  }

  public static verifyResetToken(token: string): { isValid: boolean; email?: string; error?: string } {
    if (!token) {
      return { isValid: false, error: 'Password reset token is missing.' };
    }

    const tokens = this.getTokens();
    const tokenRecord = tokens.find((t) => t.token === token);

    if (!tokenRecord) {
      return { isValid: false, error: 'Invalid or unrecognized reset token.' };
    }

    if (tokenRecord.used) {
      return { isValid: false, error: 'This password reset link has already been used.' };
    }

    if (Date.now() > tokenRecord.expiresAt) {
      return { isValid: false, error: 'This password reset link has expired (15-minute validity).' };
    }

    return { isValid: true, email: tokenRecord.email };
  }

  public static async resetPassword(token: string, newPassword: string): Promise<void> {
    const verification = this.verifyResetToken(token);
    if (!verification.isValid || !verification.email) {
      throw new Error(verification.error || 'Invalid reset token.');
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) {
      throw new Error(pwCheck.errorMessage || 'Password does not meet security criteria.');
    }

    const users = await this.getUsers();
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === verification.email!.toLowerCase()
    );

    if (userIndex === -1) {
      throw new Error('User account not found.');
    }

    // Generate new salt and update hash
    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);

    users[userIndex].salt = newSalt;
    users[userIndex].passwordHash = newHash;
    this.saveUsers(users);

    // Invalidate token
    const tokens = this.getTokens();
    const tokenIndex = tokens.findIndex((t) => t.token === token);
    if (tokenIndex !== -1) {
      tokens[tokenIndex].used = true;
      this.saveTokens(tokens);
    }
  }

  // --- Staff Management (ADMIN ONLY) ---

  public static async getAllStaff(): Promise<User[]> {
    const users = await this.getUsers();
    return users.filter((u) => u.role === 'STAFF');
  }

  public static async createStaff(data: {
    name: string;
    email: string;
    temporaryPassword: string;
    title: string;
    department: string;
    phone?: string;
    permissions: string[];
  }): Promise<User> {
    const users = await this.getUsers();
    const normalizedEmail = data.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A user with this email address already exists.');
    }

    const pwCheck = validatePassword(data.temporaryPassword);
    if (!pwCheck.isValid) {
      throw new Error(pwCheck.errorMessage || 'Invalid temporary password format.');
    }

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(data.temporaryPassword, salt);

    const newStaff: User = {
      id: `usr_staff_${Date.now()}`,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      salt,
      role: 'STAFF', // Strictly STAFF
      title: data.title.trim(),
      department: data.department.trim(),
      phone: data.phone?.trim() || '+1 (555) 000-0000',
      status: 'Active',
      createdAt: new Date().toISOString(),
      permissions: data.permissions,
    };

    users.push(newStaff);
    this.saveUsers(users);
    return newStaff;
  }

  public static async updateStaff(
    id: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'title' | 'department' | 'phone' | 'permissions'>>
  ): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === id && u.role === 'STAFF');
    if (index === -1) {
      throw new Error('Staff member not found.');
    }

    if (updates.email) {
      const emailConflict = users.find(
        (u) => u.id !== id && u.email.toLowerCase() === updates.email!.trim().toLowerCase()
      );
      if (emailConflict) {
        throw new Error('Another user with this email already exists.');
      }
      users[index].email = updates.email.trim().toLowerCase();
    }

    if (updates.name) users[index].name = updates.name.trim();
    if (updates.title) users[index].title = updates.title.trim();
    if (updates.department) users[index].department = updates.department.trim();
    if (updates.phone) users[index].phone = updates.phone.trim();
    if (updates.permissions) users[index].permissions = updates.permissions;

    this.saveUsers(users);
    return users[index];
  }

  public static async toggleStaffStatus(id: string): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === id && u.role === 'STAFF');
    if (index === -1) {
      throw new Error('Staff member not found.');
    }

    users[index].status = users[index].status === 'Active' ? 'Inactive' : 'Active';
    this.saveUsers(users);
    return users[index];
  }

  // --- Profile & Account Settings ---

  public static async updateProfile(
    userId: string,
    updates: Partial<Pick<User, 'name' | 'phone' | 'companyName' | 'title' | 'department'>>
  ): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    if (updates.name) users[index].name = updates.name.trim();
    if (updates.phone) users[index].phone = updates.phone.trim();
    if (updates.companyName) users[index].companyName = updates.companyName.trim();
    if (updates.title) users[index].title = updates.title.trim();
    if (updates.department) users[index].department = updates.department.trim();

    this.saveUsers(users);

    // Update active session if currently logged in
    const activeSession = this.getCurrentSession();
    if (activeSession && activeSession.user.id === userId) {
      activeSession.user = users[index];
      if (activeSession.rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession));
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSession));
      }
    }

    return users[index];
  }

  public static async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<void> {
    const users = await this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');

    const currHash = await hashPassword(currentPass, user.salt);
    if (currHash !== user.passwordHash) {
      throw new Error('Current password is incorrect.');
    }

    const pwCheck = validatePassword(newPass);
    if (!pwCheck.isValid) {
      throw new Error(pwCheck.errorMessage || 'Invalid new password format.');
    }

    const newSalt = generateSalt(16);
    user.salt = newSalt;
    user.passwordHash = await hashPassword(newPass, newSalt);
    this.saveUsers(users);
  }

  public static getSimulatedEmails(): SimulatedEmail[] {
    const raw = localStorage.getItem(MOCK_EMAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}
