/**
 * "Skriv om denne bil" — a three-step form that posts straight to BilBoost.
 * Follows the house step-form rules (`basin-step-form.md`) without Basin:
 * every step stays in the DOM, `required` is stripped on init and validated
 * per step, Next/Back are `type="button"`, Enter on a non-final step goes
 * forward, focus moves to the step title, changes are announced, the height
 * is never locked. Turnstile loads on first interaction. Without JavaScript
 * the form is one page and the `<noscript>` line says to phone instead.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    __bbTurnstileLoading?: Promise<void>;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const loadTurnstile = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  window.__bbTurnstileLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
  return window.__bbTurnstileLoading;
};

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const init = (form: HTMLFormElement) => {
  const steps = Array.from(form.querySelectorAll<HTMLElement>("[data-bb-step]"));
  const back = form.querySelector<HTMLButtonElement>('[data-bb="inquiry-back"]');
  const next = form.querySelector<HTMLButtonElement>('[data-bb="inquiry-next"]');
  const submit = form.querySelector<HTMLButtonElement>('[data-bb="inquiry-submit"]');
  const live = form.querySelector<HTMLElement>('[data-bb="inquiry-live"]');
  const progress = form.querySelector<HTMLElement>('[data-bb="inquiry-progress"]');
  const stepNow = form.querySelector<HTMLElement>('[data-bb="inquiry-step-now"]');
  const errorBox = form.querySelector<HTMLElement>('[data-bb="inquiry-error"]');
  const widgetHost = form.querySelector<HTMLElement>('[data-bb="inquiry-turnstile"]');
  const tokenField = form.querySelector<HTMLInputElement>('input[name="turnstile_token"]');
  const idField = form.querySelector<HTMLInputElement>('input[name="submission_id"]');
  const noscript = form.querySelector<HTMLElement>('[data-bb="inquiry-nojs"]');
  if (steps.length < 2 || !back || !next || !submit) return;

  const labels = JSON.parse(form.dataset.bbLabels ?? "{}") as Record<string, string>;
  const endpoint = form.dataset.bbEndpoint ?? form.action;
  const siteKey = form.dataset.bbTurnstileKey ?? "";
  let current = 0;
  let widgetId: string | null = null;

  // Native `required` would block submit on a hidden step; validate per step instead.
  for (const field of form.querySelectorAll<Field>("[required]")) {
    field.dataset.bbRequired = "1";
    field.removeAttribute("required");
  }
  if (noscript) noscript.hidden = true;
  if (progress) progress.hidden = false;
  form.classList.add("bb-inquiry--steps");

  const fieldsIn = (step: HTMLElement): Field[] =>
    Array.from(step.querySelectorAll<Field>("input, select, textarea")).filter((f) => f.type !== "hidden");

  const setError = (field: Field, message: string | null) => {
    const box = field.closest("[data-bb-field]")?.querySelector<HTMLElement>('[data-bb="field-error"]');
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (box) {
      box.textContent = message ?? "";
      box.hidden = !message;
    }
  };

  const validateStep = (step: HTMLElement): boolean => {
    let ok = true;
    let first: Field | null = null;
    const fields = fieldsIn(step);
    const radios = new Map<string, HTMLInputElement[]>();
    for (const f of fields) {
      if (f instanceof HTMLInputElement && f.type === "radio") {
        radios.set(f.name, [...(radios.get(f.name) ?? []), f]);
        continue;
      }
      const value = f.value.trim();
      let message: string | null = null;
      if (f.dataset.bbRequired === "1" && !value) message = labels.required ?? "Feltet skal udfyldes.";
      else if (value && f instanceof HTMLInputElement && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = labels.email_invalid ?? "Ugyldig e-mail.";
      else if (value && f instanceof HTMLInputElement && f.type === "tel" && value.replace(/\D/g, "").length < 6) message = labels.phone_invalid ?? "Ugyldigt telefonnummer.";
      setError(f, message);
      if (message) {
        ok = false;
        first ??= f;
      }
    }
    for (const [, group] of radios) {
      const required = group.some((r) => r.dataset.bbRequired === "1");
      const chosen = group.some((r) => r.checked);
      const box = group[0].closest("[data-bb-field]")?.querySelector<HTMLElement>('[data-bb="field-error"]');
      if (box) {
        box.textContent = required && !chosen ? (labels.required ?? "Vælg ét.") : "";
        box.hidden = !(required && !chosen);
      }
      if (required && !chosen) {
        ok = false;
        first ??= group[0];
      }
    }
    // Contact step: phone or email, not necessarily both.
    if (step.dataset.bbStep === "contact") {
      const phone = step.querySelector<HTMLInputElement>('input[name="phone"]');
      const email = step.querySelector<HTMLInputElement>('input[name="email"]');
      if (phone && email && !phone.value.trim() && !email.value.trim()) {
        setError(phone, labels.contact_required ?? "Skriv telefon eller e-mail.");
        ok = false;
        first ??= phone;
      }
    }
    first?.focus();
    return ok;
  };

  const show = (i: number, announce: boolean) => {
    current = i;
    steps.forEach((s, n) => {
      s.hidden = n !== i;
      const marker = form.querySelector<HTMLElement>(`[data-bb-step-marker="${n}"]`);
      if (marker) marker.setAttribute("aria-current", n === i ? "step" : "false");
    });
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    submit.hidden = i !== steps.length - 1;
    if (stepNow) stepNow.textContent = String(i + 1);
    if (announce) {
      const title = steps[i].querySelector<HTMLElement>("[data-bb-step-title]");
      title?.setAttribute("tabindex", "-1");
      title?.focus();
      if (live) live.textContent = (labels.step_of ?? "Trin {n} af {m}").replace("{n}", String(i + 1)).replace("{m}", String(steps.length));
      if (window.matchMedia("(max-width: 767px)").matches) form.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    if (i === steps.length - 1) void ensureTurnstile();
  };

  const ensureTurnstile = async () => {
    if (!widgetHost || !siteKey || widgetId) return;
    try {
      await loadTurnstile();
      widgetId = window.turnstile!.render(widgetHost, {
        sitekey: siteKey,
        action: "bb_inquiry",
        callback: (token: string) => {
          if (tokenField) tokenField.value = token;
        },
        "expired-callback": () => {
          if (tokenField) tokenField.value = "";
        },
      });
    } catch {
      /* the submit will answer 503 and show the phone number */
    }
  };

  const fail = (message: string) => {
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.hidden = false;
      errorBox.focus?.();
    }
    submit.disabled = false;
    submit.textContent = labels.submit ?? "Send";
  };

  next.addEventListener("click", () => validateStep(steps[current]) && show(current + 1, true));
  back.addEventListener("click", () => show(current - 1, true));
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || current === steps.length - 1) return;
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    next.click();
  });
  form.addEventListener("focusin", () => void ensureTurnstile(), { once: true });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(steps[current])) return;
    if (idField && !idField.value) idField.value = crypto.randomUUID();
    submit.disabled = true;
    submit.textContent = labels.sending ?? "Sender…";
    if (errorBox) errorBox.hidden = true;

    const data = new FormData(form);
    const body: Record<string, string> = {};
    for (const [k, v] of data) body[k] = typeof v === "string" ? v : "";
    body.page_url = window.location.href;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; error?: string };
      if (res.ok && json.redirect) {
        window.location.assign(json.redirect);
        return;
      }
      if (json.error === "bot_check_failed") {
        if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
        if (tokenField) tokenField.value = "";
        fail(labels.bot_failed ?? "Sikkerhedstjekket fejlede.");
        return;
      }
      if (json.error === "invalid_field") {
        show(steps.findIndex((s) => s.querySelector(`[name="${json.error}"]`)) >= 0 ? current : 0, true);
      }
      fail(labels.error ?? "Kunne ikke sende.");
    } catch {
      fail(labels.error ?? "Kunne ikke sende.");
    }
  });

  if (idField && !idField.value) idField.value = crypto.randomUUID();
  show(0, false);
};

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-bb="inquiry"]')) init(form);

export {};
