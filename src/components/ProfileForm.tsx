"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { saveProfile } from "@/lib/actions";
import type { EmergencyProfile } from "@/lib/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type Med = { name: string; dose: string; frequency: string };
type Contact = { name: string; relation: string; phone: string };

export default function ProfileForm({ initial }: { initial: EmergencyProfile | null }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "error">("idle");

  const [name, setName] = useState(initial?.name ?? "");
  const [dob, setDob] = useState(initial?.dob ?? "");
  const [bloodType, setBloodType] = useState(initial?.bloodType ?? "");
  const [allergies, setAllergies] = useState((initial?.allergies ?? []).join(", "));
  const [conditions, setConditions] = useState((initial?.conditions ?? []).join(", "));
  const [meds, setMeds] = useState<Med[]>(initial?.medications ?? []);
  const [contacts, setContacts] = useState<Contact[]>(initial?.emergencyContacts ?? []);
  const [insProvider, setInsProvider] = useState(initial?.insurance?.provider ?? "");
  const [insPolicy, setInsPolicy] = useState(initial?.insurance?.policyNumber ?? "");
  const [docName, setDocName] = useState(initial?.primaryDoctor?.name ?? "");
  const [docPhone, setDocPhone] = useState(initial?.primaryDoctor?.phone ?? "");

  function submit() {
    setStatus("idle");
    const payload: EmergencyProfile = {
      name: name.trim(),
      dob,
      bloodType,
      allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
      conditions: conditions.split(",").map((s) => s.trim()).filter(Boolean),
      medications: meds,
      emergencyContacts: contacts,
      insurance: { provider: insProvider, policyNumber: insPolicy },
      primaryDoctor: { name: docName, phone: docPhone },
    };
    startTransition(async () => {
      const res = await saveProfile(payload);
      if (res.ok) router.push("/");
      else setStatus("error");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-8"
    >
      {/* About you */}
      <Section title={t("aboutYou")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fullName")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoComplete="name"
            />
          </Field>
          <Field label={t("dob")}>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label={t("bloodType")}>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              className={inputCls}
            >
              <option value="">{t("bloodTypeUnknown")}</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Medical */}
      <Section title={t("medical")}>
        <Field label={t("allergies")} hint={t("commaHint")}>
          <input
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder={t("allergiesPlaceholder")}
            className={inputCls}
          />
        </Field>
        <Field label={t("conditions")} hint={t("commaHint")}>
          <input
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder={t("conditionsPlaceholder")}
            className={inputCls}
          />
        </Field>

        {/* Medications */}
        <div>
          <div className="mb-1 block text-xs font-medium text-[var(--color-fg-muted)]">
            {t("medications")}
          </div>
          <div className="space-y-2">
            {meds.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={m.name}
                  onChange={(e) => setMeds((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                  placeholder={t("medName")}
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={m.dose}
                  onChange={(e) => setMeds((p) => p.map((x, idx) => (idx === i ? { ...x, dose: e.target.value } : x)))}
                  placeholder={t("medDose")}
                  className={`${inputCls} w-24`}
                />
                <input
                  value={m.frequency}
                  onChange={(e) => setMeds((p) => p.map((x, idx) => (idx === i ? { ...x, frequency: e.target.value } : x)))}
                  placeholder={t("medFreq")}
                  className={`${inputCls} w-28`}
                />
                <RemoveBtn label={tc("cancel")} onClick={() => setMeds((p) => p.filter((_, idx) => idx !== i))} />
              </div>
            ))}
          </div>
          <AddBtn label={t("addMedication")} onClick={() => setMeds((p) => [...p, { name: "", dose: "", frequency: "" }])} />
        </div>
      </Section>

      {/* Emergency contacts */}
      <Section title={t("emergencyContacts")}>
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.name}
                onChange={(e) => setContacts((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                placeholder={t("contactName")}
                className={`${inputCls} flex-1`}
              />
              <input
                value={c.relation}
                onChange={(e) => setContacts((p) => p.map((x, idx) => (idx === i ? { ...x, relation: e.target.value } : x)))}
                placeholder={t("contactRelation")}
                className={`${inputCls} w-28`}
              />
              <input
                value={c.phone}
                onChange={(e) => setContacts((p) => p.map((x, idx) => (idx === i ? { ...x, phone: e.target.value } : x)))}
                placeholder={t("contactPhone")}
                inputMode="tel"
                className={`${inputCls} w-36`}
              />
              <RemoveBtn label={tc("cancel")} onClick={() => setContacts((p) => p.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
        <AddBtn label={t("addContact")} onClick={() => setContacts((p) => [...p, { name: "", relation: "", phone: "" }])} />
      </Section>

      {/* Care & insurance */}
      <Section title={t("careInsurance")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("doctorName")}>
            <input value={docName} onChange={(e) => setDocName(e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("doctorPhone")}>
            <input value={docPhone} onChange={(e) => setDocPhone(e.target.value)} inputMode="tel" className={inputCls} />
          </Field>
          <Field label={t("insuranceProvider")}>
            <input value={insProvider} onChange={(e) => setInsProvider(e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("policyNumber")}>
            <input value={insPolicy} onChange={(e) => setInsPolicy(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-strong)] disabled:opacity-60"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {pending ? tc("saving") : t("saveProfile")}
        </button>
        {status === "error" && (
          <span className="text-sm text-[var(--color-alert)]">{t("saveError")}</span>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-brand)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 font-display text-lg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-fg-muted)]">
        {label}
        {hint && <span className="ml-1 font-normal text-[var(--color-fg-dim)]">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function RemoveBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-md p-2 text-[var(--color-fg-dim)] hover:bg-[var(--color-alert-soft)] hover:text-[var(--color-alert)]"
    >
      <Trash2 size={16} />
    </button>
  );
}
