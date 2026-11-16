export const GALLERY_CATEGORIES = [
  { value: "cctv", label: "CCTV" },
  { value: "intercoms", label: "Intercoms & door entry" },
  { value: "access_control", label: "Access control" },
  { value: "networks", label: "WiFi & networks" },
  { value: "other", label: "Other" },
] as const;

export const ENQUIRY_SERVICES = ["CCTV", "Intercom / door entry", "Access control", "WiFi / networking", "Service or repair", "Something else"];

export function galleryUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${path}`;
}

/** UK number -> wa.me format */
export function whatsappLink(num: string) {
  const digits = num.replace(/\D/g, "").replace(/^0/, "44");
  return `https://wa.me/${digits}`;
}
