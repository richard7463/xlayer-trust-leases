import { ProofPage } from '@/components/proof-page';
import { getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function ProofRoutePage() {
  const siteData = await getSiteData();
  return <ProofPage {...siteData} />;
}
