import type {
  PaymentGateway,
  PayUrlInput,
  QueryResult,
  QueryStatus,
  RefundResult,
} from '../src/payments/payment-gateway.js';

// Cổng thanh toán giả lập (ADR 005): trả kết quả cố định, không gọi VNPay.
// Chữ ký hợp lệ là chuỗi SIGNED; test tự đặt kết quả truy vấn và hoàn tiền.
export const SIGNED = 'chu-ky-hop-le';

export class FakePaymentGateway implements PaymentGateway {
  // Kết quả truy vấn theo mã giao dịch; chưa đặt thì coi như khách chưa trả
  readonly results = new Map<string, QueryStatus | 'ERROR'>();
  refundOk = true;
  readonly payUrls: PayUrlInput[] = [];
  readonly refunds: string[] = [];

  createPayUrl(input: PayUrlInput): string {
    this.payUrls.push(input);
    const bank = input.bankCode ? `&vnp_BankCode=${input.bankCode}` : '';
    return `https://cong-thanh-toan.test/pay?vnp_TxnRef=${input.txnRef}&vnp_Amount=${input.amount * 100}${bank}`;
  }

  verifySignature(params: Record<string, string>): boolean {
    return params.vnp_SecureHash === SIGNED;
  }

  query(txnRef: string): Promise<QueryResult> {
    const status = this.results.get(txnRef) ?? 'NOT_PAID';
    if (status === 'ERROR') {
      return Promise.reject(new Error('Cổng thanh toán không phản hồi'));
    }
    return Promise.resolve({
      status,
      responseCode: '00',
      transactionNo: status === 'SUCCESS' ? `GD-${txnRef}` : '',
    });
  }

  refund(input: { txnRef: string }): Promise<RefundResult> {
    this.refunds.push(input.txnRef);
    return Promise.resolve({
      ok: this.refundOk,
      responseCode: this.refundOk ? '00' : '99',
      message: this.refundOk ? 'Đã hoàn tiền' : 'Lỗi hệ thống',
    });
  }

  // Tham số Return URL / IPN có chữ ký hợp lệ
  callback(txnRef: string, amount: number, responseCode = '00') {
    return {
      vnp_TxnRef: txnRef,
      vnp_Amount: String(amount * 100),
      vnp_ResponseCode: responseCode,
      vnp_SecureHash: SIGNED,
    };
  }
}
