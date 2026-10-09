export const readNotificationDeliveryResponse = async (response: Response, fallback: string) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    if (response.status === 404) throw new Error("Layanan pengiriman belum tersedia pada server ini. Backend perlu diperbarui.");
    throw new Error(fallback + " Server tidak memberikan respons data yang valid.");
  }
  try { return await response.json(); }
  catch { throw new Error(fallback + " Respons server tidak dapat dibaca."); }
};
