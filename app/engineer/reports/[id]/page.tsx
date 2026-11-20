import { ReportEditor } from "@/components/ReportEditor";

export default async function ReportPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; sent?: string }>;
}) {
  const { id } = await params;
  return <ReportEditor id={id} sp={await searchParams} />;
}
