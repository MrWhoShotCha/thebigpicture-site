// Booking form: pre-fills the service, sends the inquiry, and shows the right next step.
(() => {
  const form = document.getElementById("inquiry");
  if (!form) return;
  const status = document.getElementById("form-status");
  const errorEl = document.getElementById("form-error");
  const endpoint = form.dataset.endpoint;
  const email = form.dataset.email;
  const callUrl = form.dataset.call;
  const min = Number(form.dataset.min || 800);
  const PHOTO = ["portraits", "headshots"];

  const params = new URLSearchParams(location.search);
  const pre = params.get("service");
  if (pre) {
    const opt = form.service.querySelector(`option[value="${CSS.escape(pre)}"]`);
    if (opt) form.service.value = pre;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]));

  function nextStep(data) {
    const first = esc((data.get("name") || "").split(" ")[0] || "there");
    const budget = Number(data.get("budget"));
    const service = data.get("service");
    if (PHOTO.includes(service)) {
      return `<h3>Thanks, ${first}.</h3><p>Got it. I'll email your proposal within 24 hours. Photo sessions don't need a call.</p>`;
    }
    if (budget < min) {
      return `<h3>Thanks, ${first}.</h3><p>My video packages start at $${min.toLocaleString()}. I'll email you options that fit your budget, like a portrait or headshot session, within 24 hours.</p>`;
    }
    const call = callUrl
      ? `<p>Next step: pick a time for a quick 15-minute call.</p><a class="btn btn-primary" href="${esc(callUrl)}" target="_blank" rel="noopener">Book your call</a>`
      : `<p>Next step: a quick 15-minute call. I'll reach out within 24 hours to set it up.</p>`;
    return `<h3>Thanks, ${first}.</h3>${call}`;
  }

  function show(html) {
    form.hidden = true;
    status.innerHTML = html;
    status.hidden = false;
    status.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const missing = [...form.querySelectorAll("[required]")].filter((f) => !f.value.trim());
    if (missing.length || !form.email.checkValidity()) {
      errorEl.textContent = "Please fill in the highlighted fields.";
      (missing[0] || form.email).focus();
      missing.forEach((f) => f.setAttribute("aria-invalid", "true"));
      return;
    }
    form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
    const data = new FormData(form);
    if (data.get("_gotcha")) return;
    const budgetLabel = form.budget.options[form.budget.selectedIndex].text;
    const serviceLabel = form.service.options[form.service.selectedIndex].text;
    data.set("budget_range", budgetLabel);
    data.set("service_name", serviceLabel);
    const btn = form.querySelector("button[type=submit]");

    if (endpoint) {
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
        show(nextStep(data));
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Send inquiry";
        errorEl.textContent = email
          ? `Something went wrong sending your inquiry. Please email ${email} instead.`
          : "Something went wrong sending your inquiry. Please try again in a minute.";
      }
      return;
    }

    if (email) {
      const lines = ["name", "email", "phone", "brand", "date", "location", "project", "source"].map((k) => `${k}: ${data.get(k) || ""}`);
      lines.splice(3, 0, `service: ${serviceLabel}`, `budget: ${budgetLabel}`);
      location.href = `mailto:${email}?subject=${encodeURIComponent(`New inquiry: ${serviceLabel}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
      show(nextStep(data));
      return;
    }

    errorEl.textContent = "The booking form isn't connected yet. Please reach out on Instagram for now.";
  });
})();
