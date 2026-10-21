import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cncQuoteConfig } from "@/config/cncQuote";
import { api } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { INTL_LOCALE } from "@/i18n/money";
import {
  checkFileMeta,
  formatBytes,
  inspectSvgText,
  NOTES_MAX,
  parseDecimal,
  validateContact,
  validateDetails,
  type ContactDetails,
  type FieldErrors,
  type QuoteDetails,
  type SvgInfo,
} from "@/lib/cncQuote";
import { cn } from "@/lib/cn";
import { Field, fieldProps } from "@/components/ui/FormField";
import { optionLabel } from "@/i18n/content";

const STEP_COUNT = 4;

interface UploadedFile {
  /** Held in memory until the request is sent; never stored. */
  blob: File;
  name: string;
  size: number;
  info: SvgInfo;
  /** Object URL used only as an <img> source — scripts in an SVG never run in that context. */
  previewUrl?: string;
}

/**
 * Step-by-step CNC quote request: SVG file → size/material/quantity →
 * contact → review. The file is validated here, kept in memory and sent with
 * the request; the server checks it again before storing it.
 */
export function CncQuoteForm() {
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [checkingFile, setCheckingFile] = useState(false);
  const [details, setDetails] = useState<QuoteDetails>({ widthCm: "", heightCm: "", material: "", quantity: "1" });
  const [contact, setContact] = useState<ContactDetails>({ name: "", email: "", phone: "", notes: "" });
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the step heading on navigation so screen readers announce the new step.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // Release the preview URL on unmount; replaced URLs are released in handleFile.
  // (Not tied to `file` changes: StrictMode re-runs effects and would revoke a URL still on screen.)
  const previewUrlRef = useRef<string | undefined>(undefined);
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const detailErrors = validateDetails(details, t.validation);
  const contactErrors = validateContact(contact, t.validation);
  const stepValid = [Boolean(file), isEmpty(detailErrors), isEmpty(contactErrors), true];
  // Errors appear only after the shopper tries to move on from the step.
  const dErr: FieldErrors<keyof QuoteDetails> = showErrors ? detailErrors : {};
  const cErr: FieldErrors<keyof ContactDetails> = showErrors ? contactErrors : {};

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after fixing it
    if (!picked) return;

    setFileError(null);
    const metaError = checkFileMeta(picked, t.validation);
    if (metaError) {
      setFileError(metaError);
      return;
    }
    setCheckingFile(true);
    try {
      const inspection = inspectSvgText(await picked.text(), t.validation);
      if (!inspection.ok) {
        setFileError(inspection.error);
        return;
      }
      const previewUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(picked) : undefined;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;
      setFile({ blob: picked, name: picked.name, size: picked.size, info: inspection.info, previewUrl });
    } catch {
      setFileError(t.quote.fileUnreadable);
    } finally {
      setCheckingFile(false);
    }
  }

  function next() {
    if (!stepValid[step]) {
      setShowErrors(true);
      if (step === 0) setFileError((err) => err ?? t.quote.chooseFileFirst);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }

  function goTo(target: number) {
    setShowErrors(false);
    setSubmitError(null);
    setStep(target);
  }

  async function submit() {
    if (!file) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await api.submitCncQuote({ file: file.blob, details, contact }, t.api);
    setSubmitting(false);
    if (result.ok) setReference(result.reference);
    else setSubmitError(result.message);
  }

  function startOver() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = undefined;
    setFile(null);
    setFileError(null);
    setDetails({ widthCm: "", heightCm: "", material: "", quantity: "1" });
    setContact({ name: "", email: "", phone: "", notes: "" });
    setShowErrors(false);
    setSubmitError(null);
    setReference(null);
    setStep(0);
  }

  useEffect(() => {
    if (reference) confirmationRef.current?.focus();
  }, [reference]);

  const physical = file?.info.physicalCm;
  const viewBox = file?.info.viewBox;
  const width = parseDecimal(details.widthCm);
  const ratioHeight = viewBox && width ? Math.round((width * viewBox.height * 10) / viewBox.width) / 10 : undefined;

  if (reference && file) {
    return (
      <div className="space-y-4">
        <h2 ref={confirmationRef} tabIndex={-1} className="text-xl outline-none">
          {t.quote.received}
        </h2>
        <p role="status" className="rounded-input border border-divider bg-paper-soft px-4 py-3 text-sm">
          {t.quote.receivedBefore} <strong>{contact.email}</strong> {t.quote.receivedAfter}
        </p>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-body/60">{t.quote.reference}:</dt>
            <dd className="font-medium">{reference}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-body/60">{t.quote.file}:</dt>
            <dd className="break-all">{file.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-body/60">{t.quote.request}:</dt>
            <dd>{t.quote.summary(details.widthCm, details.heightCm, optionLabel(details.material), details.quantity)}</dd>
          </div>
        </dl>
        <Button type="button" variant="secondary" onClick={startOver}>
          {t.quote.newRequest}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ol className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label={t.quote.stepsLabel}>
        {t.quote.steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn("flex items-center gap-1.5", i === step ? "font-medium text-ink" : "text-body/50")}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                i === step ? "border-ink bg-ink text-white" : i < step ? "border-ink" : "border-line",
              )}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-xl outline-none">
        {t.quote.steps[step]}
      </h2>

      {step === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-body/70">
            {t.quote.uploadIntro(formatBytes(cncQuoteConfig.maxFileBytes))}
          </p>
          <div>
            <label
              htmlFor="cnc-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-divider px-4 py-8 text-center text-sm transition-colors hover:border-ink focus-within:border-ink"
            >
              <span className="font-medium">{file ? t.quote.chooseAnother : t.quote.chooseFile}</span>
              <span className="text-xs text-body/60">.svg</span>
              <input
                id="cnc-file"
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFile}
                disabled={checkingFile}
                aria-describedby={fileError ? "cnc-file-error" : undefined}
                className="sr-only"
              />
            </label>
            {checkingFile ? <p className="mt-2 text-xs text-body/60">{t.quote.checking}</p> : null}
            {fileError ? (
              <p id="cnc-file-error" role="alert" className="mt-2 text-xs text-danger">
                {fileError}
              </p>
            ) : null}
          </div>

          {file ? (
            <div className="flex gap-4 rounded-card bg-paper-soft p-4">
              {file.previewUrl ? (
                <img
                  src={file.previewUrl}
                  alt={t.quote.previewAlt(file.name)}
                  className="h-24 w-24 shrink-0 rounded-input bg-white object-contain p-1"
                />
              ) : null}
              <div className="text-sm">
                <p className="font-medium break-all">{file.name}</p>
                <p className="text-body/60">{formatBytes(file.size)}</p>
                <p className="mt-1 text-xs text-body/60">
                  {physical ? t.quote.fileSize(physical.width, physical.height) : t.quote.noPhysicalSize}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          {physical ? (
            <button
              type="button"
              onClick={() =>
                setDetails((d) => ({
                  ...d,
                  widthCm: String(physical.width).replace(".", ","),
                  heightCm: String(physical.height).replace(".", ","),
                }))
              }
              className="rounded-full border border-line px-3 py-1.5 text-xs transition-colors hover:border-ink"
            >
              {t.quote.useFileSize(physical.width, physical.height)}
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field id="cnc-width" label={t.quote.width} error={dErr.widthCm}>
              <input
                {...fieldProps("cnc-width", dErr.widthCm)}
                inputMode="decimal"
                value={details.widthCm}
                onChange={(e) => setDetails((d) => ({ ...d, widthCm: e.target.value }))}
              />
            </Field>
            <Field
              id="cnc-height"
              label={t.quote.height}
              error={dErr.heightCm}
              hint={ratioHeight ? t.quote.ratioHint(ratioHeight.toLocaleString(INTL_LOCALE[locale])) : undefined}
            >
              <input
                {...fieldProps("cnc-height", dErr.heightCm)}
                inputMode="decimal"
                value={details.heightCm}
                onChange={(e) => setDetails((d) => ({ ...d, heightCm: e.target.value }))}
              />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-body/60">
            {t.quote.sizeRange(cncQuoteConfig.minSizeCm, cncQuoteConfig.maxSizeCm)}
          </p>
          <Field id="cnc-material" label={t.quote.material} error={dErr.material}>
            <select
              {...fieldProps("cnc-material", dErr.material)}
              value={details.material}
              onChange={(e) => setDetails((d) => ({ ...d, material: e.target.value }))}
            >
              <option value="">{t.quote.choose}</option>
              {cncQuoteConfig.materials.map((m) => (
                <option key={m} value={m}>
                  {optionLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="cnc-quantity" label={t.quote.quantity} error={dErr.quantity}>
            <input
              {...fieldProps("cnc-quantity", dErr.quantity)}
              inputMode="numeric"
              value={details.quantity}
              onChange={(e) => setDetails((d) => ({ ...d, quantity: e.target.value }))}
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <Field id="cnc-name" label={t.forms.name} error={cErr.name}>
            <input
              {...fieldProps("cnc-name", cErr.name)}
              autoComplete="name"
              value={contact.name}
              onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
            />
          </Field>
          <Field id="cnc-email" label={t.forms.email} error={cErr.email}>
            <input
              {...fieldProps("cnc-email", cErr.email)}
              type="email"
              autoComplete="email"
              value={contact.email}
              onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
            />
          </Field>
          <Field id="cnc-phone" label={t.forms.phoneOptional} error={cErr.phone}>
            <input
              {...fieldProps("cnc-phone", cErr.phone)}
              type="tel"
              autoComplete="tel"
              value={contact.phone}
              onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
            />
          </Field>
          <Field
            id="cnc-notes"
            label={t.forms.notesOptional}
            error={cErr.notes}
            hint={`${contact.notes.length}/${NOTES_MAX}`}
          >
            <textarea
              {...fieldProps("cnc-notes", cErr.notes)}
              rows={4}
              value={contact.notes}
              placeholder={t.quote.notesPlaceholder}
              onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
            />
          </Field>
        </div>
      ) : null}

      {step === 3 && file ? (
        <div className="space-y-4 text-sm">
          <ReviewBlock title={t.quote.steps[0]!} onEdit={() => goTo(0)}>
            <p className="break-all">
              {file.name} · {formatBytes(file.size)}
            </p>
          </ReviewBlock>
          <ReviewBlock title={t.quote.steps[1]!} onEdit={() => goTo(1)}>
            <p>{t.quote.summary(details.widthCm, details.heightCm, optionLabel(details.material), details.quantity)}</p>
          </ReviewBlock>
          <ReviewBlock title={t.quote.steps[2]!} onEdit={() => goTo(2)}>
            <p>{contact.name}</p>
            <p>{contact.email}</p>
            {contact.phone ? <p>{contact.phone}</p> : null}
            {contact.notes ? <p className="mt-1 whitespace-pre-line text-body/70">{contact.notes}</p> : null}
          </ReviewBlock>
          <p className="text-xs text-body/60">
            {t.quote.priceNote}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={submitting}>
            {t.quote.back}
          </Button>
        ) : (
          <span />
        )}
        {step < STEP_COUNT - 1 ? (
          <Button type="button" onClick={next} disabled={checkingFile}>
            {t.quote.next}
          </Button>
        ) : (
          <Button type="button" onClick={submit} isLoading={submitting}>
            {t.quote.submit}
          </Button>
        )}
      </div>
      {submitError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-card border border-line p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-body font-medium">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs underline" aria-label={t.quote.editSection(title)}>
          {t.quote.edit}
        </button>
      </div>
      {children}
    </div>
  );
}

function isEmpty(o: object): boolean {
  return Object.keys(o).length === 0;
}
