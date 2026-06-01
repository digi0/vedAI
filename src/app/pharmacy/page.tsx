import { listPharmacyItems, listMedicationOrders, getProfile } from "@/lib/db";
import PharmacyClient from "@/components/PharmacyClient";

export const dynamic = "force-dynamic";

export default async function Pharmacy() {
  const [items, orders, profile] = await Promise.all([
    listPharmacyItems(),
    listMedicationOrders(),
    getProfile(),
  ]);

  return (
    <PharmacyClient
      items={items}
      orders={orders}
      allergies={profile?.allergies ?? []}
    />
  );
}
