/* =========================================================
   Green Court Tennis Club — interactions
   ========================================================= */

const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const toFa = (value) => String(value).replace(/\d/g, (d) => FA[+d]);
const toEn = (value) => String(value).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const num = (value) => toFa(value.toLocaleString("en-US")).replace(/,/g, "٬");
const money = (amount) => `${num(amount)} تومان`;
const faDate = (key, options) =>
  new Intl.DateTimeFormat("fa-IR", options).format(new Date(`${key}T12:00:00`));
const faMonthYear = (key) =>
  `${faDate(key, { month: "long" })} ${faDate(key, { year: "numeric" })}`;

const PRICE_PER_HOUR = 1200000;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 23;
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const EXTRAS = {
  racket: { label: "اجاره راکت (یک ساعت)", price: 100000 },
  balls: { label: "اجاره سبد توپ ۵۰ عددی", price: 200000 },
  coach: { label: "جلسه مربی خصوصی (یک ساعت)", price: 1000000 },
};
const DISCOUNTS = { GREEN10: 0.1, WELCOME15: 0.15 };

/* ── small helpers ────────────────────────────────────── */
const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const formatHour = (hour) => `${toFa(String(hour).padStart(2, "0"))}:۰۰`;

function toast(message) {
  const host = document.getElementById("toasts");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 260);
  }, 2600);
}

/* ── header, nav, progress ────────────────────────────── */
const header = document.getElementById("header");
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");
const scrollBar = document.getElementById("scrollBar");

function onScroll() {
  header.classList.toggle("is-stuck", window.scrollY > 8);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  scrollBar.style.width = `${progress * 100}%`;
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  nav.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
});

/* opening status */
(() => {
  const status = document.getElementById("liveStatus");
  const hour = new Date().getHours();
  status.textContent =
    hour >= OPEN_HOUR && hour < CLOSE_HOUR
      ? `باشگاه باز است · تا ${formatHour(CLOSE_HOUR)}`
      : `باشگاه بسته است · از ${formatHour(OPEN_HOUR)}`;
})();

/* active nav */
const navLinks = [...document.querySelectorAll(".nav__link")];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) =>
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
navSections.forEach((section) => sectionObserver.observe(section));

/* ── reveal + counters ────────────────────────────────── */
const reveal = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.1 }
);
[
  ".strip__item",
  ".section__head",
  ".wizard",
  ".summary",
  ".about__media",
  ".about__copy",
  ".coach",
  ".plan",
  ".facility",
  ".gallery__item",
  ".voice",
  ".product",
  ".post",
  ".faq details",
  ".contact__copy",
  ".contact__map",
  ".cta__inner",
].forEach((selector) => {
  document.querySelectorAll(selector).forEach((el, index) => {
    el.setAttribute("data-reveal", "");
    el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    reveal.observe(el);
  });
});

const counterObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const started = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - started) / 1400, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = toFa(Math.round(target * eased)) + (progress === 1 ? "+" : "");
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

/* =========================================================
   Booking
   ========================================================= */
const booking = {
  court: 1,
  date: iso(new Date()),
  start: null,
  duration: 2,
  extras: new Set(),
  rate: 0,
  code: "",
  step: 1,
};

const el = {
  steps: document.getElementById("steps"),
  dates: document.getElementById("dates"),
  dateMonth: document.getElementById("dateMonth"),
  datePrev: document.getElementById("datePrev"),
  dateNext: document.getElementById("dateNext"),
  slotGroups: document.getElementById("slotGroups"),
  durationSeg: document.getElementById("durationSeg"),
  extras: document.getElementById("extras"),
  discount: document.getElementById("discount"),
  discountMsg: document.getElementById("discountMsg"),
  applyDiscount: document.getElementById("applyDiscount"),
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  rules: document.getElementById("rules"),
  prevStep: document.getElementById("prevStep"),
  nextStep: document.getElementById("nextStep"),
  confirmBtn: document.getElementById("confirmBtn"),
  hint: document.getElementById("wizardHint"),
  error: document.getElementById("wizardError"),
  success: document.querySelector(".wstep--success"),
  successCode: document.getElementById("successCode"),
  successMeta: document.getElementById("successMeta"),
  newBooking: document.getElementById("newBooking"),
  sumCourt: document.getElementById("sumCourt"),
  sumDate: document.getElementById("sumDate"),
  sumTime: document.getElementById("sumTime"),
  sumDuration: document.getElementById("sumDuration"),
  sumExtras: document.getElementById("sumExtras"),
  sumBase: document.getElementById("sumBase"),
  sumDiscountRow: document.getElementById("sumDiscountRow"),
  sumDiscount: document.getElementById("sumDiscount"),
  sumTotal: document.getElementById("sumTotal"),
};

let rangeStart = new Date();

/* deterministic availability: same court/date/hour always looks the same */
const isBooked = (court, date, hour) => {
  let hash = 0;
  const key = `${court}-${date}-${hour}`;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 100003;
  return hash % 5 < 2;
};
const isPast = (date, hour) => {
  const now = new Date();
  if (date !== iso(now)) return false;
  return hour <= now.getHours();
};
const canStart = (court, date, hour, duration) =>
  hour + duration <= CLOSE_HOUR &&
  !isPast(date, hour) &&
  Array.from({ length: duration }, (_, i) => hour + i).every((h) => !isBooked(court, date, h));

const freeCount = (court, date, duration) => {
  let count = 0;
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
    if (canStart(court, date, hour, duration)) count++;
  }
  return count;
};

/* ── date rail ────────────────────────────────────────── */
function renderDates() {
  el.dates.innerHTML = "";
  const todayKey = iso(new Date());

  for (let i = 0; i < 14; i++) {
    const date = addDays(rangeStart, i);
    const key = iso(date);
    const free = freeCount(booking.court, key, booking.duration);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "date" + (key === booking.date ? " is-selected" : "");
    chip.setAttribute("aria-pressed", String(key === booking.date));
    chip.innerHTML = `
      <span class="date__day">${WEEKDAYS[date.getDay()]}</span>
      <span class="date__num">${toFa(date.getDate())}</span>
      <span class="date__dot ${free === 0 ? "full" : free <= 3 ? "busy" : ""}"></span>
    `;
    chip.addEventListener("click", () => {
      booking.date = key;
      booking.start = null;
      hideError();
      refresh();
    });
    el.dates.appendChild(chip);
  }

  el.dateMonth.textContent = faMonthYear(booking.date);
  el.datePrev.disabled = iso(rangeStart) <= todayKey;
}

function shiftRange(days) {
  const next = addDays(rangeStart, days);
  rangeStart = iso(next) < iso(new Date()) ? new Date() : next;
  renderDates();
}

el.datePrev.addEventListener("click", () => shiftRange(-7));
el.dateNext.addEventListener("click", () => shiftRange(7));

/* ── slots ────────────────────────────────────────────── */
const SLOT_GROUPS = [
  { label: "صبح", from: 8, to: 12 },
  { label: "بعدازظهر", from: 12, to: 17 },
  { label: "شب", from: 17, to: 23 },
];

function renderSlots() {
  el.slotGroups.innerHTML = "";

  SLOT_GROUPS.forEach((group) => {
    const wrap = document.createElement("div");
    wrap.className = "timegroup";
    wrap.innerHTML = `<p class="timegroup__head">${group.label} · ${formatHour(group.from)} تا ${formatHour(group.to)}</p>`;
    const grid = document.createElement("div");
    grid.className = "slots";

    for (let hour = group.from; hour < group.to; hour++) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot" + (booking.start === hour ? " is-selected" : "");
      button.textContent = formatHour(hour);
      const available = canStart(booking.court, booking.date, hour, booking.duration);
      button.disabled = !available;
      if (!available) button.title = "این زمان رزرو شده یا از مدت بازی کمتر است";
      button.setAttribute("aria-pressed", String(booking.start === hour));
      button.addEventListener("click", () => {
        booking.start = hour;
        hideError();
        renderSlots();
        updateSummary();
      });
      grid.appendChild(button);
    }

    wrap.appendChild(grid);
    el.slotGroups.appendChild(wrap);
  });
}

/* ── summary ──────────────────────────────────────────── */
function totals() {
  const base = PRICE_PER_HOUR * booking.duration;
  const extras = [...booking.extras].reduce((sum, key) => sum + EXTRAS[key].price, 0);
  const discount = Math.round((base + extras) * booking.rate);
  return { base, discount, total: base + extras - discount };
}

function updateSummary() {
  el.sumCourt.textContent = `زمین شماره ${toFa(booking.court)}`;
  el.sumDate.textContent = faDate(booking.date, { weekday: "long", day: "numeric", month: "long" });
  el.sumTime.textContent =
    booking.start === null
      ? "—"
      : `${formatHour(booking.start)} تا ${formatHour(booking.start + booking.duration)}`;
  el.sumDuration.textContent = `${toFa(booking.duration)} ساعت`;

  const { base, discount, total } = totals();
  el.sumBase.textContent = money(base);

  el.sumExtras.hidden = booking.extras.size === 0;
  el.sumExtras.innerHTML = [...booking.extras]
    .map((key) => `<span>${EXTRAS[key].label}<b>${money(EXTRAS[key].price)}</b></span>`)
    .join("");

  el.sumDiscountRow.hidden = discount === 0;
  if (discount) {
    el.sumDiscountRow.querySelector("span").textContent = `تخفیف (${booking.code})`;
    el.sumDiscount.textContent = `− ${money(discount)}`;
  }

  el.sumTotal.textContent = money(total);
}

function refresh() {
  renderDates();
  renderSlots();
  updateSummary();
}

/* ── step control ─────────────────────────────────────── */
const HINTS = {
  1: "زمین و تاریخ را انتخاب کنید",
  2: "ساعت شروع را انتخاب کنید",
  3: "اطلاعات تماس را کامل کنید",
};

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
}
function hideError() {
  el.error.hidden = true;
}

function goStep(step) {
  booking.step = step;
  document.querySelectorAll(".wstep[data-step]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.step === String(step));
  });
  document.querySelectorAll(".step").forEach((dot) => {
    const n = Number(dot.dataset.stepDot);
    dot.classList.toggle("is-active", n === step);
    dot.classList.toggle("is-done", n < step);
  });
  el.prevStep.disabled = step === 1;
  el.nextStep.hidden = step === 3;
  el.confirmBtn.hidden = step !== 3;
  el.hint.textContent = HINTS[step];
  hideError();
}

const reserveSection = document.getElementById("reserve");

function goToReserve(step) {
  goStep(step);
  reserveSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validateStep(step) {
  if (step === 2 && booking.start === null) {
    showError("لطفاً ساعت شروع بازی را از لیست انتخاب کنید.");
    return false;
  }
  if (step === 3) {
    if (el.name.value.trim().length < 3) {
      showError("نام و نام خانوادگی را کامل وارد کنید.");
      return false;
    }
    const phone = toEn(el.phone.value).replace(/[\s-]/g, "");
    if (!/^09\d{9}$/.test(phone)) {
      showError("شماره موبایل معتبر نیست. نمونه: ۰۹۱۵۱۲۳۴۵۶۷");
      return false;
    }
    if (!el.rules.checked) {
      showError("برای ادامه، پذیرش قوانین باشگاه الزامی است.");
      return false;
    }
  }
  return true;
}

el.nextStep.addEventListener("click", () => {
  if (!validateStep(booking.step)) return;
  goStep(Math.min(booking.step + 1, 3));
});
el.prevStep.addEventListener("click", () => goStep(Math.max(booking.step - 1, 1)));
el.steps.addEventListener("click", (event) => {
  const dot = event.target.closest(".step");
  if (!dot) return;
  const target = Number(dot.dataset.stepDot);
  if (target < booking.step) goStep(target);
});

/* ── court + duration ─────────────────────────────────── */
function setCourt(court) {
  booking.court = court;
  document.querySelectorAll(".court").forEach((card) => {
    const selected = Number(card.dataset.court) === court;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-checked", String(selected));
  });
}

function setDuration(duration) {
  booking.duration = duration;
  el.durationSeg.querySelectorAll("button").forEach((button) =>
    button.classList.toggle("is-active", Number(button.dataset.duration) === duration)
  );
}

document.querySelectorAll(".court").forEach((card) => {
  card.addEventListener("click", () => {
    setCourt(Number(card.dataset.court));
    booking.start = null;
    refresh();
  });
});

el.durationSeg.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-duration]");
  if (!button) return;
  setDuration(Number(button.dataset.duration));
  booking.start = null;
  refresh();
});

/* ── extras ───────────────────────────────────────────── */
el.extras.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-extra]");
  if (!input) return;
  if (input.checked) booking.extras.add(input.dataset.extra);
  else booking.extras.delete(input.dataset.extra);
  updateSummary();
});

/* ── discount ─────────────────────────────────────────── */
el.applyDiscount.addEventListener("click", () => {
  const code = el.discount.value.trim().toUpperCase();
  if (!code) {
    el.discountMsg.hidden = true;
    return;
  }
  if (DISCOUNTS[code]) {
    booking.rate = DISCOUNTS[code];
    booking.code = code;
    el.discountMsg.textContent = `کد تخفیف اعمال شد — ${toFa(DISCOUNTS[code] * 100)}٪ تخفیف`;
    el.discountMsg.className = "discount__msg ok";
    el.discountMsg.hidden = false;
    toast("کد تخفیف اعمال شد");
  } else {
    booking.rate = 0;
    booking.code = "";
    el.discountMsg.textContent = "این کد معتبر نیست. کد GREEN10 را امتحان کنید.";
    el.discountMsg.className = "discount__msg bad";
    el.discountMsg.hidden = false;
  }
  updateSummary();
});

/* ── confirm ──────────────────────────────────────────── */
el.confirmBtn.addEventListener("click", () => {
  if (!validateStep(3)) return;

  const code = `GC-${toFa(Math.floor(1000 + Math.random() * 9000))}`;
  el.successCode.textContent = code;
  el.successMeta.textContent = `${el.sumCourt.textContent} · ${el.sumDate.textContent} · ${el.sumTime.textContent} · ${el.sumTotal.textContent}`;

  document.querySelectorAll(".wstep[data-step]").forEach((panel) => panel.classList.remove("is-active"));
  el.success.hidden = false;
  el.steps.hidden = true;
  el.hint.textContent = "";
  el.prevStep.hidden = true;
  el.nextStep.hidden = true;
  el.confirmBtn.hidden = true;
  hideError();
  toast("رزرو شما با موفقیت ثبت شد");
  reserveSection.scrollIntoView({ behavior: "smooth", block: "start" });
});

function resetBooking() {
  el.success.hidden = true;
  el.steps.hidden = false;
  el.prevStep.hidden = false;
  el.name.value = "";
  el.phone.value = "";
  el.rules.checked = false;
  el.discount.value = "";
  el.discountMsg.hidden = true;
  booking.start = null;
  booking.extras.clear();
  booking.rate = 0;
  booking.code = "";
  el.extras.querySelectorAll("input[data-extra]").forEach((input) => (input.checked = false));
  goStep(1);
  refresh();
}

el.newBooking.addEventListener("click", resetBooking);

/* ── quick slots (hero) ───────────────────────────────── */
const quickSlots = document.getElementById("quickSlots");
const quickDate = document.getElementById("quickDate");

function renderQuick() {
  quickSlots.innerHTML = "";
  const today = new Date();
  let pickDate = iso(today);
  const picks = [];

  for (let hour = Math.max(OPEN_HOUR, today.getHours() + 1); hour < CLOSE_HOUR && picks.length < 3; hour++) {
    if (canStart(1, pickDate, hour, 2)) picks.push(hour);
  }
  if (!picks.length) {
    pickDate = iso(addDays(today, 1));
    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR && picks.length < 3; hour++) {
      if (canStart(1, pickDate, hour, 2)) picks.push(hour);
    }
  }

  quickDate.textContent = faDate(pickDate, { weekday: "long", day: "numeric", month: "long" });

  if (!picks.length) {
    quickSlots.innerHTML = `<p class="quick__hint">ظرفیتی برای امروز و فردا آزاد نیست؛ از تقویم رزرو انتخاب کنید.</p>`;
    return;
  }

  picks.forEach((hour) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-slot";
    button.innerHTML = `
      <span><b>${formatHour(hour)}</b> <small>تا ${formatHour(hour + 2)}</small></span>
      <span class="quick-slot__go" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M14 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;
    button.addEventListener("click", () => {
      if (!el.success.hidden) resetBooking();
      booking.date = pickDate;
      booking.start = hour;
      rangeStart = new Date(`${pickDate}T12:00:00`);
      setCourt(1);
      setDuration(2);
      refresh();
      goToReserve(2);
    });
    quickSlots.appendChild(button);
  });
}

/* =========================================================
   Shop + cart
   ========================================================= */
const PRODUCTS = [
  {
    id: "aero2023",
    name: "راکت تنیس بابولات Pure Aero 2023",
    cat: "راکت",
    price: 3500000,
    img: "assets/images/real/prod-aero2023.jpg",
    tag: "پرفروش",
  },
  {
    id: "rafa",
    name: "راکت تنیس بابولات Pure Aero Rafa",
    cat: "راکت",
    price: 2400000,
    img: "assets/images/real/prod-rafa.jpg",
  },
  {
    id: "headball",
    name: "قوطی چهارتایی توپ تنیس Head Tour",
    cat: "توپ",
    price: 995000,
    img: "assets/images/real/prod-balls.png",
    tag: "جدید",
  },
  {
    id: "odea",
    name: "قوطی سه‌تایی توپ تنیس ODEA",
    cat: "توپ",
    price: 985000,
    img: "assets/images/real/prod-odea.jpg",
  },
  {
    id: "asics",
    name: "کفش تنیس اسیکس Court FF 3",
    cat: "کفش",
    price: 8765000,
    img: "assets/images/real/prod-asics.jpg",
  },
  {
    id: "headshoe",
    name: "کفش تنیس Head Revolt Evo 2",
    cat: "کفش",
    price: 9895000,
    img: "assets/images/real/prod-headshoe.jpg",
  },
  {
    id: "bag",
    name: "کوله تنیس بابولات Pure Aero Backpack 2023",
    cat: "کیف",
    price: 14500000,
    img: "assets/images/real/prod-bag.jpg",
  },
  {
    id: "bagrafa",
    name: "کوله تنیس بابولات Pure Aero Rafa 2",
    cat: "کیف",
    price: 2400000,
    img: "assets/images/real/prod-bag2.jpg",
  },
];

const CART_KEY = "gc_cart_v1";
const productGrid = document.getElementById("productGrid");
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");

let cart = loadCart();

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(raw)
      ? raw.filter((item) => PRODUCTS.some((p) => p.id === item.id) && item.qty > 0)
      : [];
  } catch {
    return [];
  }
}
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* storage may be unavailable */
  }
}
const productById = (id) => PRODUCTS.find((p) => p.id === id);

const priceLabel = (price) =>
  price < 1e6
    ? `${num(price)} <small>تومان</small>`
    : `${toFa((price / 1e6).toLocaleString("fa-IR"))} <small>میلیون تومان</small>`;

function renderProducts() {
  productGrid.innerHTML = PRODUCTS.map(
    (product) => `
    <article class="product">
      <div class="product__media">
        <img src="${product.img}" alt="${product.name}" loading="lazy" />
        ${product.tag ? `<span class="product__tag ${product.tag === "جدید" ? "product__tag--lime" : ""}">${product.tag}</span>` : ""}
      </div>
      <div class="product__body">
        <span class="product__cat">${product.cat}</span>
        <h3>${product.name}</h3>
        <span class="product__stars">★★★★★</span>
        <div class="product__foot">
          <span class="product__price">${priceLabel(product.price)}</span>
          <button class="add-btn" type="button" data-add="${product.id}" aria-label="افزودن ${product.name} به سبد">+</button>
        </div>
      </div>
    </article>
  `
  ).join("");
}

function cartCountTotal() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}
function cartSum() {
  return cart.reduce((sum, item) => sum + productById(item.id).price * item.qty, 0);
}

function renderCart() {
  const count = cartCountTotal();
  cartCount.hidden = count === 0;
  cartCount.textContent = toFa(count);
  cartEmpty.hidden = cart.length > 0;
  cartItems.innerHTML = cart
    .map((item) => {
      const product = productById(item.id);
      return `
      <div class="cart-item">
        <img src="${product.img}" alt="${product.name}" />
        <div>
          <h4>${product.name}</h4>
          <small>${money(product.price)}</small>
        </div>
        <div class="cart-item__side">
          <b>${money(product.price * item.qty)}</b>
          <div class="qty">
            <button type="button" data-qty="${item.id}" data-delta="1" aria-label="افزودن">+</button>
            <span>${toFa(item.qty)}</span>
            <button type="button" data-qty="${item.id}" data-delta="-1" aria-label="کم کردن">−</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
  cartTotal.textContent = money(cartSum());
}

function addToCart(id) {
  const found = cart.find((item) => item.id === id);
  if (found) found.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  toast(`${productById(id).name} به سبد اضافه شد`);
}

function changeQty(id, delta) {
  const found = cart.find((item) => item.id === id);
  if (!found) return;
  found.qty += delta;
  if (found.qty <= 0) cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

const setLocked = (locked) => {
  document.body.style.overflow = locked ? "hidden" : "";
};

function openCart() {
  renderCart();
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  setLocked(true);
}
function closeCart() {
  overlay.classList.remove("is-visible");
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  setLocked(false);
  setTimeout(() => {
    if (!cartDrawer.classList.contains("is-open")) overlay.hidden = true;
  }, 300);
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});
cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-qty]");
  if (button) changeQty(button.dataset.qty, Number(button.dataset.delta));
});
document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("openCart").addEventListener("click", openCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.querySelectorAll("[data-close-cart]").forEach((link) => link.addEventListener("click", closeCart));

document.getElementById("cartCheckout").addEventListener("click", () => {
  if (!cart.length) {
    toast("سبد خرید خالی است");
    return;
  }
  cart = [];
  saveCart();
  renderCart();
  closeCart();
  toast("سفارش ثبت شد؛ برای هماهنگی تحویل تماس می‌گیریم");
});

/* =========================================================
   Gallery lightbox
   ========================================================= */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCap = document.getElementById("lightboxCap");
const galleryItems = [...document.querySelectorAll(".gallery__item")];
let lightboxIndex = 0;

function showImage(index) {
  lightboxIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[lightboxIndex];
  const img = item.querySelector("img");
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCap.textContent = `${item.querySelector("figcaption")?.textContent || ""} · ${toFa(lightboxIndex + 1)} از ${toFa(galleryItems.length)}`;
}

function openLightbox(index) {
  showImage(index);
  lightbox.hidden = false;
  requestAnimationFrame(() => lightbox.classList.add("is-visible"));
  setLocked(true);
}
function closeLightbox() {
  lightbox.classList.remove("is-visible");
  setLocked(false);
  setTimeout(() => {
    lightbox.hidden = true;
  }, 220);
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => openLightbox(index));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox(index);
    }
  });
});
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightboxPrev").addEventListener("click", () => showImage(lightboxIndex - 1));
document.getElementById("lightboxNext").addEventListener("click", () => showImage(lightboxIndex + 1));
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!lightbox.hidden) closeLightbox();
    else if (cartDrawer.classList.contains("is-open")) closeCart();
  }
  if (lightbox.hidden) return;
  if (event.key === "ArrowLeft") showImage(lightboxIndex + 1);
  if (event.key === "ArrowRight") showImage(lightboxIndex - 1);
});

/* =========================================================
   Testimonials slider
   ========================================================= */
const voiceTrack = document.getElementById("voiceTrack");
const voiceCards = [...voiceTrack.children];
const voiceDots = document.getElementById("voiceDots");
let activeVoice = 0;

function showVoice(index) {
  const card = voiceCards[Math.max(0, Math.min(index, voiceCards.length - 1))];
  const before = voiceTrack.scrollLeft;
  card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  setTimeout(() => {
    if (Math.abs(voiceTrack.scrollLeft - before) < 2) {
      card.scrollIntoView({ behavior: "auto", inline: "start", block: "nearest" });
    }
  }, 160);
}

voiceCards.forEach((_, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `نظر ${toFa(index + 1)}`);
  dot.addEventListener("click", () => showVoice(index));
  voiceDots.appendChild(dot);
});

function syncVoiceDots() {
  const trackRect = voiceTrack.getBoundingClientRect();
  const center = trackRect.left + trackRect.width / 2;
  let closest = 0;
  let min = Infinity;
  voiceCards.forEach((card, index) => {
    const cardRect = card.getBoundingClientRect();
    const distance = Math.abs(cardRect.left + cardRect.width / 2 - center);
    if (distance < min) {
      min = distance;
      closest = index;
    }
  });
  activeVoice = closest;
  [...voiceDots.children].forEach((dot, index) => {
    dot.classList.toggle("is-active", index === closest);
    if (index === closest) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
}

voiceTrack.addEventListener("scroll", syncVoiceDots, { passive: true });
document.getElementById("voicePrev").addEventListener("click", () => showVoice(Math.max(activeVoice - 1, 0)));
document.getElementById("voiceNext").addEventListener("click", () =>
  showVoice(Math.min(activeVoice + 1, voiceCards.length - 1))
);

/* =========================================================
   Newsletter
   ========================================================= */
document.getElementById("newsletter").addEventListener("submit", (event) => {
  event.preventDefault();
  event.target.reset();
  toast("عضویت شما در خبرنامه ثبت شد");
});

/* =========================================================
   Init
   ========================================================= */
renderProducts();
renderCart();
refresh();
renderQuick();
goStep(1);
syncVoiceDots();
