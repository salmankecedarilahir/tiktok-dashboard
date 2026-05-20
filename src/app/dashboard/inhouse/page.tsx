import { InhouseClient } from "./inhouse-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function InhousePage() {
  const now = new Date();
  return (
    <InhouseClient
      initialMonth={now.getMonth() + 1}
      initialYear={now.getFullYear()}
    />
  );
}
