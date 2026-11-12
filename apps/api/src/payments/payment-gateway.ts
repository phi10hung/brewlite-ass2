// Interface cổng thanh toán (ADR 005 mục 5). PaymentsService chỉ gọi qua interface này:
// chạy thật dùng VnpayGateway (VNPay Sandbox), test dùng bản giả lập trả kết quả cố định.

export type PayUrlInput = {
  txnRef: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  createDate: Date;
  expireDate: Date;
  // Thẻ: "VNBANK" (thẻ nội địa). Ví: không gửi, khách chọn cách trả trên trang VNPay.
  bankCode?: string;
};

// Kết quả hỏi lại một giao dịch:
// SUCCESS  = đã trả tiền thành công
// FAILED   = giao dịch lỗi
// NOT_PAID = chưa trả hoặc VNPay chưa có giao dịch này
// UNKNOWN  = chưa xác minh được (VNPay lỗi, trả mã lạ)
export type QueryStatus = 'SUCCESS' | 'FAILED' | 'NOT_PAID' | 'UNKNOWN';

export type QueryResult = {
  status: QueryStatus;
  responseCode: string;
  transactionNo: string;
};

export type RefundInput = {
  txnRef: string;
  amount: number;
  transactionNo: string;
  // Thời điểm tạo giao dịch thanh toán (VNPay đối chiếu với lúc tạo payUrl)
  createDate: Date;
};

export type RefundResult = {
  ok: boolean;
  responseCode: string;
  message: string;
};

export interface PaymentGateway {
  // Tạo đường dẫn thanh toán có chữ ký
  createPayUrl(input: PayUrlInput): string;
  // Kiểm tra chữ ký của kết quả gửi về (Return URL, IPN)
  verifySignature(params: Record<string, string>): boolean;
  // Hỏi lại kết quả thật của giao dịch
  query(txnRef: string, createDate: Date): Promise<QueryResult>;
  // Gửi yêu cầu hoàn tiền
  refund(input: RefundInput): Promise<RefundResult>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
