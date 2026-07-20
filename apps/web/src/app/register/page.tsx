import { redirect } from "next/navigation";

/**
 * Đăng ký đã bị khoá vĩnh viễn (backend: POST /auth/register luôn 403 vì đã có 1 user).
 * Redirect thẳng về /login để không có trang chết gọi API rồi nhận 403 gây confusing.
 */
export default function RegisterPage() {
  redirect("/login");
}
