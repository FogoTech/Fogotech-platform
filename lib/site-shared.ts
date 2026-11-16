export const GALLERY_CATEGORIES = [
  { value: "cctv", label: "CCTV" },
  { value: "alarms", label: "Intruder alarms" },
  { value: "access_control", label: "Access control" },
  { value: "networks", label: "Network infrastructure" },
  { value: "wireless", label: "Wireless AP" },
  { value: "audio", label: "Audio" },
  { value: "av", label: "Visual" },
  { value: "other", label: "Other" },
] as const;

export const ENQUIRY_SERVICES = ["CCTV", "Intruder alarms", "Access control / door entry", "Network infrastructure", "Wireless AP / WiFi", "Audio", "Visual / screens", "Service or repair", "Something else"];

export function galleryUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${path}`;
}

/** UK number -> wa.me format */
export function whatsappLink(num: string) {
  const digits = num.replace(/\D/g, "").replace(/^0/, "44");
  return `https://wa.me/${digits}`;
}
