export const examApprovalDeliveryError = (status: string | undefined, waitExpired = false): string | null => {
  if (status === "FAILED") return "Password belum berhasil dikirim ke pengawas. Silakan coba kembali.";
  if (status === "UNCERTAIN") return "Pengiriman belum dapat dikonfirmasi. Tekan Coba lagi untuk memeriksa status pengiriman.";
  if (status === "EXPIRED") return "Password sudah kedaluwarsa. Silakan minta password baru.";
  if (status === "PENDING" && waitExpired) return "Permintaan masih diproses. Status akan diperbarui otomatis.";
  return null;
};
