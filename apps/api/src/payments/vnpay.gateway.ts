import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  PaymentGateway,
  PayUrlInput,
  QueryResult,
  RefundInput,
  RefundResult,
} from './payment-gateway.js';

type Params = Record<string, string>;

// VNPay mã hóa khoảng trắng thành "+" khi ký
const encode = (value: string) =>
  encodeURIComponent(value).replace(/%20/g, '+');

// Chuỗi ký: tham số sắp theo tên, đã mã hóa, nối bằng "&"
function signData(params: Params): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encode(params[key])}`)
    .join('&');
}

function hmacSha512(data: string, secret: string): string {
  return createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase());
  const right = Buffer.from(b.toLowerCase());
  return left.length === right.length && timingSafeEqual(left, right);
}

// VNPay dùng giờ Việt Nam (GMT+7), dạng yyyyMMddHHmmss, không phụ thuộc múi giờ của server
export function formatVnpayDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${vn.getUTCFullYear()}${pad(vn.getUTCMonth() + 1)}${pad(vn.getUTCDate())}` +
    `${pad(vn.getUTCHours())}${pad(vn.getUTCMinutes())}${pad(vn.getUTCSeconds())}`
  );
}

// "::1", "::ffff:1.2.3.4" → dạng IPv4 VNPay nhận
function ipv4(ipAddr: string): string {
  const ip = ipAddr.trim();
  if (!ip || ip === '::1') return '127.0.0.1';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

// Kết nối VNPay Sandbox (ADR 005). Khóa lấy từ biến môi trường, không ghi vào log (NFR-07).
@Injectable()
export class VnpayGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

  createPayUrl(input: PayUrlInput): string {
    const { tmnCode, hashSecret, payUrl, returnUrl } = this.settings();
    const params: Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      // VNPay tính tiền theo đơn vị nhỏ nhất: nhân 100
      vnp_Amount: String(input.amount * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipv4(input.ipAddr),
      vnp_CreateDate: formatVnpayDate(input.createDate),
      vnp_ExpireDate: formatVnpayDate(input.expireDate),
    };
    if (input.bankCode) params.vnp_BankCode = input.bankCode;

    const data = signData(params);
    return `${payUrl}?${data}&vnp_SecureHash=${hmacSha512(data, hashSecret)}`;
  }

  verifySignature(params: Record<string, string>): boolean {
    const { hashSecret } = this.settings();
    const { vnp_SecureHash: hash, vnp_SecureHashType: _type, ...rest } = params;
    if (!hash) return false;
    return sameText(hmacSha512(signData(rest), hashSecret), hash);
  }

  async query(txnRef: string, createDate: Date): Promise<QueryResult> {
    const { tmnCode, hashSecret, apiUrl } = this.settings();
    const requestId = randomBytes(12).toString('hex');
    const now = formatVnpayDate(new Date());
    const orderInfo = `Truy van giao dich ${txnRef}`;
    const transactionDate = formatVnpayDate(createDate);
    // Thứ tự chuỗi ký của lệnh querydr theo tài liệu VNPay
    const sign = [
      requestId,
      '2.1.0',
      'querydr',
      tmnCode,
      txnRef,
      transactionDate,
      now,
      '127.0.0.1',
      orderInfo,
    ].join('|');

    const data = await this.post(apiUrl, {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: tmnCode,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: now,
      vnp_IpAddr: '127.0.0.1',
      vnp_SecureHash: hmacSha512(sign, hashSecret),
    });

    // vnp_ResponseCode: kết quả của câu hỏi; vnp_TransactionStatus: trạng thái giao dịch
    const responseCode = text(data.vnp_ResponseCode);
    const transactionStatus = text(data.vnp_TransactionStatus);
    let status: QueryResult['status'] = 'UNKNOWN';
    if (responseCode === '91') status = 'NOT_PAID';
    if (responseCode === '00') {
      if (transactionStatus === '00') status = 'SUCCESS';
      else if (transactionStatus === '01') status = 'NOT_PAID';
      else if (transactionStatus === '02') status = 'FAILED';
    }
    return {
      status,
      responseCode,
      transactionNo: text(data.vnp_TransactionNo),
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const { tmnCode, hashSecret, apiUrl } = this.settings();
    const requestId = randomBytes(12).toString('hex');
    const now = formatVnpayDate(new Date());
    const amount = String(input.amount * 100);
    const orderInfo = `Hoan tien giao dich ${input.txnRef}`;
    const transactionDate = formatVnpayDate(input.createDate);
    // "02" = hoàn toàn phần. Thứ tự chuỗi ký của lệnh refund theo tài liệu VNPay
    const sign = [
      requestId,
      '2.1.0',
      'refund',
      tmnCode,
      '02',
      input.txnRef,
      amount,
      input.transactionNo,
      transactionDate,
      'BrewLite',
      now,
      '127.0.0.1',
      orderInfo,
    ].join('|');

    const data = await this.post(apiUrl, {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: tmnCode,
      vnp_TransactionType: '02',
      vnp_TxnRef: input.txnRef,
      vnp_Amount: amount,
      vnp_OrderInfo: orderInfo,
      vnp_TransactionNo: input.transactionNo,
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: 'BrewLite',
      vnp_CreateDate: now,
      vnp_IpAddr: '127.0.0.1',
      vnp_SecureHash: hmacSha512(sign, hashSecret),
    });

    const responseCode = text(data.vnp_ResponseCode);
    return {
      ok: responseCode === '00',
      responseCode,
      message: text(data.vnp_Message),
    };
  }

  private async post(url: string, body: Params) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`VNPay trả về HTTP ${response.status}`);
    }
    return (await response.json()) as Record<string, unknown>;
  }

  // Thiếu khóa thì báo 503, không in giá trị khóa
  private settings() {
    const read = (key: string) => {
      const value = this.config.get<string>(key)?.trim();
      if (!value) {
        throw new ServiceUnavailableException('Chưa cấu hình thanh toán VNPay');
      }
      return value;
    };
    return {
      tmnCode: read('VNP_TMN_CODE'),
      hashSecret: read('VNP_HASH_SECRET'),
      payUrl: read('VNP_PAY_URL'),
      apiUrl: read('VNP_API_URL'),
      returnUrl: read('VNP_RETURN_URL'),
    };
  }
}
