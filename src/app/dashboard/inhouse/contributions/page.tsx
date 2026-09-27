import { ContributionsClient } from "./contributions-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ContributionsPage() {
  return <ContributionsClient />;
}
