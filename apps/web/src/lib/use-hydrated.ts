import { useSyncExternalStore } from "react";

// Không cần theo dõi gì: giá trị chỉ đổi một lần, từ server (false) sang trình duyệt (true)
const subscribe = () => () => {};

// true khi giao diện đã chạy ở trình duyệt. Giỏ hàng nằm trong localStorage, server không đọc được,
// nên chờ true rồi mới hiện số liệu của giỏ để HTML server và trình duyệt không lệch nhau.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}