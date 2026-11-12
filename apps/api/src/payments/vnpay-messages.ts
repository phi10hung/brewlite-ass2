// Lý do thanh toán không thành công theo mã kết quả VNPay (FR-16 tiêu chí 1, FR-19 tiêu chí 3)
const MESSAGES: Record<string, string> = {
  '07': 'Giao dịch bị nghi ngờ gian lận',
  '09': 'Thẻ hoặc tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ hoặc tài khoản sai quá 3 lần',
  '11': 'Đã hết thời gian chờ thanh toán',
  '12': 'Thẻ hoặc tài khoản đang bị khóa',
  '13': 'Nhập sai mã OTP',
  '24': 'Bạn đã hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản đã vượt hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần cho phép',
};

export function vnpayMessage(responseCode: string): string {
  return MESSAGES[responseCode] ?? 'Thanh toán không thành công';
}
