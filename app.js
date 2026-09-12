/* MVP shared behaviour: mobile nav, reveal, consent, analytics, form validation + spam traps */
(function () {
  "use strict";

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "✕" : "☰";
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Cookieless analytics (consent-gated) ---------- */
  var CONSENT_KEY = "mvp-consent";
  var banner = document.getElementById("cookie-banner");

  function track() {
    try {
      var payload = JSON.stringify({
        site: document.body.getAttribute("data-site") || "unknown",
        path: location.pathname,
        ref: document.referrer || "",
        ts: Date.now()
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  function applyConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
    if (banner) banner.hidden = true;
    if (v === "accepted") track();
  }

  try {
    var stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "accepted") { track(); }
    else if (stored === null && banner) { banner.hidden = false; }
  } catch (e) {
    if (banner) banner.hidden = false;
  }

  var acceptBtn = document.getElementById("cookie-accept");
  var declineBtn = document.getElementById("cookie-decline");
  if (acceptBtn) acceptBtn.addEventListener("click", function () { applyConsent("accepted"); });
  if (declineBtn) declineBtn.addEventListener("click", function () { applyConsent("declined"); });

  /* ---------- Contact form: validation + spam traps ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var loadedAt = Date.now();
    var GH_PHONE = /^(\+233|0)\s?\d{2}\s?\d{3}\s?\d{4}$/;
    var status = document.getElementById("form-status");
    var phoneInput = document.getElementById("cf-phone");
    var phoneErr = document.getElementById("err-phone");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) { status.textContent = ""; }

      /* Honeypot: bots fill hidden fields */
      var hp = document.getElementById("cf-website");
      if (hp && hp.value.trim() !== "") { return; }

      /* Time trap: humans need a few seconds */
      if (Date.now() - loadedAt < 3000) { return; }

      var name = form.name.value.trim();
      var phone = form.phone.value.trim();
      var msg = form.message.value.trim();

      var ok = true;
      if (!name) { form.name.setAttribute("aria-invalid", "true"); ok = false; }
      else { form.name.removeAttribute("aria-invalid"); }

      if (!GH_PHONE.test(phone)) {
        form.phone.setAttribute("aria-invalid", "true");
        if (phoneErr) phoneErr.hidden = false;
        ok = false;
      } else {
        form.phone.removeAttribute("aria-invalid");
        if (phoneErr) phoneErr.hidden = true;
      }

      if (!msg) { form.message.setAttribute("aria-invalid", "true"); ok = false; }
      else { form.message.removeAttribute("aria-invalid"); }

      if (!ok) {
        if (status) { status.textContent = "Please fix the highlighted fields."; status.style.color = "#b3261e"; }
        return;
      }

      /* No backend in this static MVP: hand off to WhatsApp with the composed message */
      var waLink = document.querySelector(".wa-float");
      var wa = waLink ? waLink.getAttribute("href") : null;
      if (status) {
        status.style.color = "";
        status.textContent = "Thanks, " + name + "! Opening WhatsApp so your message reaches us directly…";
      }
      if (wa) {
        var text = encodeURIComponent("Hello! I'm " + name + " (" + phone + "). " + msg);
        window.open(wa + "?text=" + text, "_blank", "noopener");
      }
      form.reset();
    });

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        if (GH_PHONE.test(phoneInput.value.trim())) {
          phoneInput.removeAttribute("aria-invalid");
          if (phoneErr) phoneErr.hidden = true;
        }
      });
    }
  }
})();
