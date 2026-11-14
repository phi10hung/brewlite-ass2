// VNPay giả lập cho E2E test (ADR 005): thay VNPay Sandbox để test không cần mạng, không cần khóa thật.
// API vẫn chạy code thật, chỉ trỏ VNP_PAY_URL, VNP_API_URL tới đây.
// - Trang thanh toán: kiểm tra chữ ký như VNPay, hiện số tiền và 2 nút "Thanh toán thành công" (mã 00),
//   "Hủy thanh toán" (mã 24); bấm thì chuyển về vnp_ReturnUrl kèm kết quả có chữ ký.
// - API truy vấn lại (querydr), hoàn tiền (refund): trả kết quả theo giao dịch đã bấm ở trang thanh toán.
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_VNPAY_PORT ?? 4900);
const SECRET = process.env.VNP_HASH_SECRET;
if (!SECRET) throw new Error('Thiếu VNP_HASH_SECRET cho VNPay giả lập');

// Kết quả đã bấm của từng giao dịch: mã giao dịch → { code, transactionNo }
const results = new Map();
let nextTransactionNo = 14000001;

// Ký giống VNPay (và vnpay.gateway.ts): tham số sắp theo tên, khoảng trắng thành "+"
const encode = (value) => encodeURIComponent(value).replace(/%20/g, '+');
const signData = (params) =>
  Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encode(params[key])}`)
    .join('&');
const sign = (data) =>
  createHmac('sha512', SECRET).update(data, 'utf8').digest('hex');

function validRequest(params) {
  const { vnp_SecureHash: hash, ...rest } = params;
  return Boolean(hash) && sign(signData(rest)) === hash.toLowerCase();
}

function html(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>VNPay giả lập</title></head>
<body style="font-family: sans-serif; padding: 16px">${body}</body></html>`);
}

// Trang thanh toán: GET /paymentv2/vpcpay.html?<tham số có chữ ký từ API>
function payPage(url, res) {
  const params = Object.fromEntries(url.searchParams);
  if (!validRequest(params)) {
    html(res, 400, '<h1>Sai chữ ký</h1>');
    return;
  }
  const amount = Number(params.vnp_Amount) / 100;
  const query = url.search.slice(1);
  html(
    res,
    200,
    `<h1>VNPay giả lập</h1>
<p>Đơn: ${params.vnp_OrderInfo}</p>
<p>Số tiền: <strong>${amount.toLocaleString('vi-VN')}đ</strong></p>
<p><a href="/paymentv2/result?code=00&${query}">Thanh toán thành công</a></p>
<p><a href="/paymentv2/result?code=24&${query}">Hủy thanh toán</a></p>`,
  );
}

// Bấm nút: ghi kết quả, chuyển về Return URL kèm kết quả có chữ ký như VNPay gửi
function finishPayment(url, res) {
  const { code, ...params } = Object.fromEntries(url.searchParams);
  if (!validRequest(params)) {
    html(res, 400, '<h1>Sai chữ ký</h1>');
    return;
  }
  const transactionNo = String(nextTransactionNo++);
  results.set(params.vnp_TxnRef, { code, transactionNo });
  const result = {
    vnp_Amount: params.vnp_Amount,
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: params.vnp_OrderInfo,
    vnp_PayDate: params.vnp_CreateDate,
    vnp_ResponseCode: code,
    vnp_TmnCode: params.vnp_TmnCode,
    vnp_TransactionNo: transactionNo,
    vnp_TransactionStatus: code === '00' ? '00' : '02',
    vnp_TxnRef: params.vnp_TxnRef,
  };
  const data = signData(result);
  res.writeHead(302, {
    Location: `${params.vnp_ReturnUrl}?${data}&vnp_SecureHash=${sign(data)}`,
  });
  res.end();
}

// API của VNPay: POST /merchant_webapi/api/transaction (querydr, refund)
function transactionApi(body, res) {
  let reply;
  if (body.vnp_Command === 'querydr') {
    const result = results.get(body.vnp_TxnRef);
    // 91: VNPay không có giao dịch này (khách chưa trả)
    reply = result
      ? {
          vnp_ResponseCode: '00',
          vnp_TransactionStatus: result.code === '00' ? '00' : '02',
          vnp_TransactionNo: result.transactionNo,
        }
      : { vnp_ResponseCode: '91' };
  } else if (body.vnp_Command === 'refund') {
    reply = { vnp_ResponseCode: '00', vnp_Message: 'Hoan tien thanh cong' };
  } else {
    reply = { vnp_ResponseCode: '99' };
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(reply));
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.end('ok');
  } else if (
    req.method === 'GET' &&
    url.pathname === '/paymentv2/vpcpay.html'
  ) {
    payPage(url, res);
  } else if (req.method === 'GET' && url.pathname === '/paymentv2/result') {
    finishPayment(url, res);
  } else if (
    req.method === 'POST' &&
    url.pathname === '/merchant_webapi/api/transaction'
  ) {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => transactionApi(JSON.parse(raw || '{}'), res));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, () => console.log(`VNPay giả lập chạy ở cổng ${PORT}`));