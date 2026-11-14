import PaymentResultView from "@/components/PaymentResultView";

// Trang kết quả thanh toán /payment/result (FR-19): VNPay chuyển khách về đây (VNP_RETURN_URL).
// Tham số VNPay nằm trên đường dẫn, PaymentResultView đọc ở trình duyệt rồi gửi server xác minh.
export default function PaymentResultPage() {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Kết quả thanh toán</h1>
      <PaymentResultView />
    </section>
  );
}