import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { formatVnpayDate, VnpayGateway } from './vnpay.gateway.js';

const SETTINGS: Record<string, string> = {
  VNP_TMN_CODE: 'TESTCODE',
  VNP_HASH_SECRET: 'khoa-chi-dung-trong-test',
  VNP_PAY_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  VNP_API_URL: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  VNP_RETURN_URL: 'http://localhost:3000/payment/result',
};
const gateway = (settings = SETTINGS) =>
  new VnpayGateway({ get: (key: string) => settings[key] } as ConfigService);

const INPUT = {
  txnRef: 'BLTHU001ABCDEF',
  amount: 125000,
  orderInfo: 'Thanh toan don BL-THU001',
  ipAddr: '::1',
  createDate: new Date('2026-11-12T03:04:05Z'),
  expireDate: new Date('2026-11-12T03:09:05Z'),
};

// Lấy tham số trên payUrl như VNPay chuyển về Return URL
const paramsOf = (url: string) =>
  Object.fromEntries(new URL(url).searchParams.entries());

describe('VnpayGateway (UT-60 – UT-62)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('UT-60: payUrl có chữ ký HMAC-SHA512, số tiền ×100, giờ Việt Nam; sửa tham số thì chữ ký sai', () => {
    const url = gateway().createPayUrl({ ...INPUT, bankCode: 'VNBANK' });
    const params = paramsOf(url);

    expect(params.vnp_Amount).toBe('12500000');
    expect(params.vnp_BankCode).toBe('VNBANK');
    expect(params.vnp_CreateDate).toBe('20261112100405');
    expect(params.vnp_IpAddr).toBe('127.0.0.1');
    expect(params.vnp_SecureHash).toMatch(/^[0-9a-f]{128}$/);
    expect(url).not.toContain('khoa-chi-dung-trong-test');

    expect(gateway().verifySignature(params)).toBe(true);
    expect(gateway().verifySignature({ ...params, vnp_Amount: '100' })).toBe(
      false,
    );
    expect(formatVnpayDate(new Date('2026-12-31T17:00:00Z'))).toBe(
      '20270101000000',
    );
  });

  it('UT-61: đọc kết quả truy vấn: 00/00 thành công, 00/01 và 91 chưa trả, 00/02 lỗi, mã khác chưa rõ', async () => {
    const answer = (body: object) =>
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }),
      );
    const status = async (body: object) => {
      answer(body);
      return (await gateway().query('BLTHU001ABCDEF', INPUT.createDate)).status;
    };

    expect(
      await status({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00' }),
    ).toBe('SUCCESS');
    expect(
      await status({ vnp_ResponseCode: '00', vnp_TransactionStatus: '01' }),
    ).toBe('NOT_PAID');
    expect(await status({ vnp_ResponseCode: '91' })).toBe('NOT_PAID');
    expect(
      await status({ vnp_ResponseCode: '00', vnp_TransactionStatus: '02' }),
    ).toBe('FAILED');
    expect(await status({ vnp_ResponseCode: '99' })).toBe('UNKNOWN');
  });

  it('UT-62: thiếu khóa VNPay thì báo 503, không in giá trị khóa', () => {
    const missing = { ...SETTINGS, VNP_HASH_SECRET: '' };
    expect(() => gateway(missing).createPayUrl(INPUT)).toThrow(
      new ServiceUnavailableException('Chưa cấu hình thanh toán VNPay'),
    );
  });
});
