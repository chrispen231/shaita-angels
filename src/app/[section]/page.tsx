import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionPage from "@/components/SectionPage";
import { sections } from "@/data/site";

type SectionKey = keyof typeof sections;
const sectionKeys = Object.keys(sections) as SectionKey[];

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return sectionKeys.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  if (!sectionKeys.includes(section as SectionKey)) return {};
  return { title: sections[section as SectionKey].eyebrow };
}

export default async function SectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sectionKeys.includes(section as SectionKey)) notFound();
  return <SectionPage section={section as SectionKey} />;
}
