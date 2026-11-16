export const GALLERY_CATEGORIES = [
  { value: "cctv", label: "CCTV" },
  { value: "alarms", label: "Intruder alarms" },
  { value: "access_control", label: "Access control & intercoms" },
  { value: "networks", label: "WiFi & networks" },
  { value: "audio", label: "PA & sound" },
  { value: "av", label: "TV, AV & signage" },
  { value: "other", label: "Other" },
] as const;

export const ENQUIRY_SERVICES = ["CCTV", "Intruder alarm", "Access control / intercom", "WiFi / networking", "PA & sound system", "TV, AV or digital signage", "Service or repair", "Something else"];

export function galleryUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${path}`;
}

/** UK number -> wa.me format */
export function whatsappLink(num: string) {
  const digits = num.replace(/\D/g, "").replace(/^0/, "44");
  return `https://wa.me/${digits}`;
}
