import { listPharmacyItems, listMedicationOrders } from "@/lib/db";
import PharmacyClient from "@/components/PharmacyClient";

export const dynamic = "force-dynamic";

export default async function Pharmacy() {
  const [items, orders] = await Promise.all([
    listPharmacyItems(),
    listMedicationOrders(),
  ]);

  return <PharmacyClient items={items} orders={orders} />;
}
