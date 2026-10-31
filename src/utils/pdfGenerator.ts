import { Invoice, Payment } from '../types';
import { formatCurrency, formatDate } from './formatters';

export class PDFGenerator {
  /**
   * Builds the formatted HTML string for an A4 payment receipt document.
   */
  public static generatePaymentReceiptHTML(payment: Payment, invoice?: Invoice): string {
    const isReversed = payment.status === 'Reversed';
    const isPending = payment.status === 'Pending';
    const isFailed = payment.status === 'Failed';

    const statusBadge = isReversed
      ? { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', label: 'REVERSED' }
      : isPending
      ? { bg: '#fffbeb', text: '#b45309', border: '#fde68a', label: 'PENDING' }
      : isFailed
      ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: 'FAILED' }
      : { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: 'CONFIRMED & RECEIVED' };

    const invoiceTotal = invoice ? invoice.totalAmount : payment.amount;
    const remainingBalance = invoice ? (invoice.amountDue ?? (invoice.totalAmount - invoice.paidAmount)) : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${payment.paymentNumber} — Brightloop Software</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .receipt-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    @media print {
      body { padding: 0; }
      .receipt-card { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">
    <!-- Header -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: #4f46e5; color: white; border-radius: 8px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">B</div>
            <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; margin-left: 8px;">Brightloop<span style="color: #4f46e5;">.</span></span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6;">
            Brightloop Software Inc. · Finance & Remittance Operations<br>
            100 Enterprise Way, Suite 400 · San Francisco, CA 94105<br>
            Tax ID / GSTIN: BL-9842104-TAX · payments@brightloop.io
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">PAYMENT RECEIPT</div>
          <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${payment.paymentNumber}</div>
          <div style="margin-top: 8px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${statusBadge.bg}; color: ${statusBadge.text}; border: 1px solid ${statusBadge.border}; text-transform: uppercase;">
              ${statusBadge.label}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;">

    <!-- Summary Banner -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Amount Received</div>
        <div style="font-size: 28px; font-weight: 800; color: #047857; margin-top: 2px;">${formatCurrency(payment.amount)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Settled via ${payment.method}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Payment Date</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatDate(payment.paymentDate)}</div>
        <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px;">Ref: ${payment.transactionReference}</div>
      </div>
    </div>

    <!-- Payer & Invoice Allocation -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 8px;">Received From (Customer)</div>
          <div style="font-weight: 700; font-size: 15px; color: #0f172a;">${payment.companyName}</div>
          <div style="color: #475569; margin-top: 2px;">Attn: ${payment.customerName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Customer ID: ${payment.customerId}</div>
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; margin-bottom: 8px;">Applied Invoice & Account</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Invoice Reference:</span>
            <span style="font-weight: 700; color: #0f172a; font-family: monospace;">${payment.invoiceNumber}</span>
          </div>
          ${payment.subscriptionNumber ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Subscription Contract:</span>
            <span style="font-weight: 600; color: #0f172a; font-family: monospace;">${payment.subscriptionNumber}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #64748b;">Recorded By:</span>
            <span style="color: #334155; font-weight: 500;">${payment.recordedBy || 'Accounts Team'}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Allocation Accounting Table -->
    <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
      Payment-To-Invoice Allocation Summary
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <thead>
        <tr style="background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; font-weight: 600; color: #334155;">
          <th style="padding: 10px; text-align: left;">Description</th>
          <th style="padding: 10px; text-align: left;">Reference</th>
          <th style="padding: 10px; text-align: right;">Invoice Amount</th>
          <th style="padding: 10px; text-align: right;">Amount Applied</th>
          <th style="padding: 10px; text-align: right;">Balance Remaining</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 10px; font-weight: 600; color: #0f172a;">
            Subscription Billing Settlement
            <div style="font-size: 11px; color: #64748b; font-weight: normal; margin-top: 2px;">
              Method: ${payment.method} · Gateway/UTR: ${payment.transactionReference}
            </div>
          </td>
          <td style="padding: 12px 10px; font-family: monospace; color: #4f46e5;">${payment.invoiceNumber}</td>
          <td style="padding: 12px 10px; text-align: right; color: #334155;">${formatCurrency(invoiceTotal)}</td>
          <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: #047857;">+${formatCurrency(payment.amount)}</td>
          <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: ${remainingBalance > 0 ? '#b91c1c' : '#047857'};">
            ${formatCurrency(remainingBalance)}
          </td>
        </tr>
      </tbody>
    </table>

    ${payment.notes || payment.referenceNote ? `
    <!-- Notes / Audit Memo -->
    <div style="background: #f8fafc; border-left: 3px solid #4f46e5; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
      <div style="font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase;">Transaction Notes</div>
      <div style="font-size: 12px; color: #334155; margin-top: 4px;">${payment.notes || payment.referenceNote}</div>
    </div>` : ''}

    ${isReversed ? `
    <!-- Reversal Audit Notice -->
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; color: #9f1239; font-size: 12px;">
      <div style="font-weight: 700; font-size: 13px;">⚠️ NOTICE OF TRANSACTION REVERSAL</div>
      <div style="margin-top: 4px;">This payment was formally reversed on <strong>${formatDate(payment.reversedAt || '')}</strong> by <strong>${payment.reversedBy || 'Accounts Admin'}</strong>.</div>
      <div style="margin-top: 2px;">Audit Reversal Reason: <em>"${payment.reversedReason || 'Billing reconciliation adjustment'}"</em></div>
    </div>` : ''}

    <!-- Footer & Verification Notice -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
      <div>
        Official digital receipt generated by Brightloop Software Billing Engine.<br>
        Transaction authenticated with ID: <code>${payment.transactionReference}</code>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: #475569;">Brightloop Software Inc.</div>
        <div>Verified Remittance System</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Opens print dialog for A4 formatted payment receipt.
   */
  public static printPaymentReceipt(payment: Payment, invoice?: Invoice): void {
    const html = this.generatePaymentReceiptHTML(payment, invoice);
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Please allow popups to print payment receipts.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }

  /**
   * Downloads formatted payment receipt document.
   */
  public static downloadPaymentReceiptPDF(payment: Payment, invoice?: Invoice): void {
    const html = this.generatePaymentReceiptHTML(payment, invoice);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Brightloop_Receipt_${payment.paymentNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  /**
   * Builds the formatted HTML string for an A4 invoice document.
   */
  public static generateInvoiceHTML(invoice: Invoice): string {
    const itemsRows = (invoice.items || [])
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
          <td style="padding: 12px 10px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 12px 10px;">
            <div style="font-weight: 600; color: #0f172a;">${item.productName}</div>
            ${item.variantName ? `<div style="font-size: 11px; color: #4f46e5; margin-top: 2px;">Variant: ${item.variantName}</div>` : ''}
            ${item.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.description}</div>` : ''}
          </td>
          <td style="padding: 12px 10px; text-align: center; color: #334155; font-weight: 500;">${item.quantity}</td>
          <td style="padding: 12px 10px; text-align: right; color: #334155;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding: 12px 10px; text-align: right; color: #64748b;">${item.taxRate}% (${formatCurrency(item.taxAmount)})</td>
          <td style="padding: 12px 10px; text-align: right; color: #64748b;">${formatCurrency(item.discountAmount || 0)}</td>
          <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(item.lineTotal)}</td>
        </tr>
      `
      )
      .join('');

    const statusBadgeColor =
      invoice.status === 'Paid'
        ? { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }
        : invoice.status === 'Overdue'
        ? { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }
        : invoice.status === 'Confirmed' || invoice.status === 'Sent'
        ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
        : invoice.status === 'Cancelled'
        ? { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' }
        : { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} — Brightloop Software</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      margin: 0;
      padding: 24px;
      background: #ffffff;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <tr>
        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="background: #4f46e5; color: white; border-radius: 8px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">B</div>
            <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; margin-left: 8px;">Brightloop<span style="color: #4f46e5;">.</span></span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6;">
            Brightloop Software Inc.<br>
            100 Enterprise Way, Suite 400<br>
            San Francisco, CA 94105, United States<br>
            Tax ID / GSTIN: BL-9842104-TAX · billing@brightloop.io
          </div>
        </td>
        <td style="text-align: right; vertical-align: top;">
          <div style="font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">TAX INVOICE</div>
          <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #4f46e5; margin-top: 4px;">${invoice.invoiceNumber}</div>
          <div style="margin-top: 8px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${statusBadgeColor.bg}; color: ${statusBadgeColor.text}; border: 1px solid ${statusBadgeColor.border}; text-transform: uppercase;">
              ${invoice.status}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;">

    <!-- Billing Info & Dates -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 16px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Billed To:</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${invoice.companyName}</div>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">Attn: ${invoice.customerName}</div>
          ${invoice.customerEmail ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${invoice.customerEmail}</div>` : ''}
          ${invoice.subscriptionNumber ? `<div style="font-size: 11px; color: #4f46e5; font-weight: 600; margin-top: 4px;">Subscription Ref: ${invoice.subscriptionNumber}</div>` : ''}
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Invoice Date:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatDate(invoice.invoiceDate || invoice.issueDate)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700; color: ${invoice.status === 'Overdue' ? '#e11d48' : '#0f172a'};">${formatDate(invoice.dueDate)}</td>
            </tr>
            ${invoice.billingPeriodStart ? `
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Billing Cycle Period:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500; color: #334155;">${formatDate(invoice.billingPeriodStart)} → ${formatDate(invoice.billingPeriodEnd || '')}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Payment Terms:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #0f172a;">${invoice.paymentTerms || 'Net 30 Days'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
          <th style="padding: 10px; text-align: left; width: 30px;">#</th>
          <th style="padding: 10px; text-align: left;">Item & Description</th>
          <th style="padding: 10px; text-align: center; width: 60px;">Qty</th>
          <th style="padding: 10px; text-align: right; width: 90px;">Rate</th>
          <th style="padding: 10px; text-align: right; width: 110px;">Tax (GST/VAT)</th>
          <th style="padding: 10px; text-align: right; width: 80px;">Discount</th>
          <th style="padding: 10px; text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals Section -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <tr>
        <td style="width: 55%; vertical-align: top; padding-right: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Payment Remittance Details</div>
            <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
              <strong>Bank Name:</strong> Silicon Valley Enterprise Bank<br>
              <strong>Beneficiary:</strong> Brightloop Software Inc.<br>
              <strong>Account Number:</strong> 8472-9103-4412-BL<br>
              <strong>Routing / SWIFT:</strong> SVBUS6S<br>
              <strong>Reference:</strong> ${invoice.invoiceNumber}
            </div>
          </div>
          ${invoice.notes ? `
          <div style="margin-top: 12px; font-size: 11px; color: #64748b; font-style: italic;">
            <strong>Notes:</strong> ${invoice.notes}
          </div>
          ` : ''}
        </td>
        <td style="width: 45%; vertical-align: top;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Tax Total (GST/VAT):</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(invoice.taxTotal)}</td>
            </tr>
            ${invoice.discountTotal ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Total Discounts Applied:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #16a34a;">-${formatCurrency(invoice.discountTotal)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 10px 0; font-size: 15px; font-weight: 800; color: #0f172a;">Invoice Grand Total:</td>
              <td style="padding: 10px 0; text-align: right; font-size: 17px; font-weight: 800; color: #4f46e5;">${formatCurrency(invoice.totalAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #047857; font-weight: 600;">Amount Paid:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #047857;">${formatCurrency(invoice.paidAmount)}</td>
            </tr>
            <tr style="border-top: 1px dashed #cbd5e1;">
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Balance Outstanding:</td>
              <td style="padding: 8px 0; text-align: right; font-size: 15px; font-weight: 800; color: ${invoice.amountDue > 0 ? '#e11d48' : '#047857'};">
                ${formatCurrency(invoice.amountDue)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Footer Terms -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
      All fees are invoiced and payable pursuant to Brightloop Master Software & Services Agreement.<br>
      Automated direct-debit clients are debited on billing cycle date. For questions regarding this invoice, contact accounts@brightloop.io.
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Opens print dialog for A4 formatted invoice.
   */
  public static printInvoice(invoice: Invoice): void {
    const html = this.generateInvoiceHTML(invoice);
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Please allow popups to print invoices.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Trigger print once rendered
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }

  /**
   * Generates downloadable invoice document (styled HTML document with embedded styles ready for A4 PDF conversion).
   */
  public static downloadInvoicePDF(invoice: Invoice): void {
    const html = this.generateInvoiceHTML(invoice);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Brightloop_Invoice_${invoice.invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
