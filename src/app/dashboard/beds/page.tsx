import { BedsList } from "./BedsList";

export default function BedsPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Camas</h1>
      <BedsList />
    </main>
  );
}
