import { ContributionEditorClient } from "./contribution-editor-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContributionEditorClient planId={id} />;
}
