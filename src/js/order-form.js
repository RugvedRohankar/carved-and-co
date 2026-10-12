// Pre-order form: bundle pricing, inline validation, and submission.

// [quantity, price] bundles for each kind of piece.
const BUNDLES = {
  ornament: [[1, 15], [2, 25]],
  custom: [[1, 20], [2, 35]],
  coaster: [[1, 12], [3, 30], [4, 38]],
};

// Cheapest way to make up `qty` pieces from the bundles on offer.
export function bestPrice(kind, qty) {
  const bundles = BUNDLES[kind];
  const cost = [0];
  for (let n = 1; n <= qty; n++) {
    cost[n] = Math.min(...bundles.filter(([count]) => count <= n).map(([count, price]) => cost[n - count] + price));
  }
  return cost[qty];
}

export function initOrderForm() {
  const form = document.querySelector('[data-order-form]');
  if (!form) return { prefill() {} };

  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    design: form.elements.design,
    quantity: form.elements.quantity,
    custom: form.elements.custom_text,
  };
  const total = form.querySelector('[data-total]');
  const status = form.querySelector('[data-form-status]');
  const customOpt = form.querySelector('[data-custom-opt]');
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.textContent;

  const kind = () => fields.design.selectedOptions[0]?.dataset.kind ?? null;
  const quantity = () => Number.parseInt(fields.quantity.value, 10);

  const rules = {
    name: () => (fields.name.value.trim() ? '' : 'Enter your name.'),
    email: () => {
      const value = fields.email.value.trim();
      if (!value) return 'Enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter an email address like name@example.com.';
    },
    design: () => (fields.design.value ? '' : 'Choose a design.'),
    quantity: () => {
      const n = quantity();
      return Number.isInteger(n) && n >= 1 && n <= 24 ? '' : 'Enter a quantity from 1 to 24.';
    },
    custom: () => (kind() === 'custom' && !fields.custom.value.trim() ? 'Enter the text you want engraved.' : ''),
  };

  function check(key) {
    const field = fields[key];
    const message = rules[key]();
    const error = form.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    error.textContent = message;
    error.hidden = !message;
    const describedBy = new Set((field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
    if (message) describedBy.add(error.id);
    else describedBy.delete(error.id);
    if (describedBy.size) field.setAttribute('aria-describedby', [...describedBy].join(' '));
    else field.removeAttribute('aria-describedby');
    return !message;
  }

  const stepButtons = [...form.querySelectorAll('[data-qty]')];

  function update() {
    const k = kind();
    const isCustom = k === 'custom';
    customOpt.textContent = isCustom ? 'required' : 'optional';
    fields.custom.required = isCustom;
    if (fields.custom.getAttribute('aria-invalid') === 'true') check('custom');

    const n = quantity();
    stepButtons.forEach((button) => {
      button.disabled = Number(button.dataset.qty) < 0 ? !(n > 1) : n >= 24;
    });
    if (!k) total.textContent = 'Choose a design';
    else if (!Number.isInteger(n) || n < 1 || n > 24) total.textContent = 'Enter a quantity';
    else total.textContent = n === 1 ? `$${bestPrice(k, 1)}` : `$${bestPrice(k, n)} for ${n}`;
  }

  function setStatus(message, state = 'info') {
    status.textContent = message;
    status.dataset.state = state;
  }

  // Validate a field once the visitor leaves it, then keep it honest as they fix it.
  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    field.addEventListener('blur', () => check(key));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') check(key);
      update();
    });
  });
  fields.design.addEventListener('change', () => {
    check('design');
    update();
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const next = Math.min(24, Math.max(1, (quantity() || 1) + Number(button.dataset.qty)));
      fields.quantity.value = String(next);
      check('quantity');
      update();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = Object.keys(fields).filter((key) => !check(key));
    if (invalid.length) {
      setStatus(invalid.length === 1 ? 'Fix 1 field to send your pre-order.' : `Fix ${invalid.length} fields to send your pre-order.`, 'error');
      fields[invalid[0]].focus();
      return;
    }

    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      setStatus('This form is not connected yet, so your pre-order was not sent.', 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending pre-order';
    setStatus('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      form.reset();
      update();
      setStatus('Pre-order sent. Thank you.');
    } catch {
      setStatus('Your pre-order was not sent. Check your connection and try again.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });

  update();

  return {
    // Used by the collection tiles and the engraving preview to hand a choice to the form.
    prefill({ design, customText } = {}) {
      if (design && [...fields.design.options].some((option) => option.value === design)) {
        fields.design.value = design;
        check('design');
      }
      if (customText !== undefined) fields.custom.value = customText;
      update();
    },
  };
}
