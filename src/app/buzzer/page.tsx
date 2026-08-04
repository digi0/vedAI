import type { Metadata } from "next";
import Buzzer from "@/components/Buzzer";

export const metadata: Metadata = {
  title: "Buzzer",
  description: "A game-show buzzer. Tap to buzz, time the round, keep score.",
};

export default function BuzzerPage() {
  return (
    <div className="py-4">
      <h1 className="font-display mb-8 text-center text-3xl sm:text-4xl">Buzzer</h1>
      <Buzzer />
    </div>
  );
}
