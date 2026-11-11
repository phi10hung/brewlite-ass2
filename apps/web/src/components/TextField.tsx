// Một ô nhập có nhãn và dòng báo lỗi bên dưới, dùng chung cho form đăng nhập, đăng ký
export default function TextField({
  id,
  label,
  error,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-loi` : undefined}
        className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 aria-invalid:border-red-700"
        {...input}
      />
      {error && (
        <p id={`${id}-loi`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}