const STORAGE_KEY = "customCigarBuilderBlendsV1";
const AGE_KEY = "customCigarAgeConfirmedV1";
const ADMIN_PRODUCTS_KEY = "customCigarAdminProductsV1";
const API_BASE = "";
const ADMIN_PASSWORD = "customHouseBlend123";
const FALLBACK_TOBACCO_IMAGE = "https://images.unsplash.com/photo-1606503825008-909a67e63c3d?auto=format&fit=crop&w=500&q=80";

const cigarSizes = [
  {
    id: "Robusto",
    name: "Robusto — 5 x 50",
    basePrice: 3.5,
    tobaccoMultiplier: 1,
    description: "Balanced size with strong flavor delivery."
  },
  {
    id: "Toro",
    name: "Toro — 6 x 52",
    basePrice: 5,
    tobaccoMultiplier: 1.25,
    description: "Longer smoke with more filler capacity."
  },
  {
    id: "Churchill",
    name: "Churchill — 7 x 48",
    basePrice: 5,
    tobaccoMultiplier: 1.25,
    description: "Large classic format for extended sessions."
  },
  {
    id: "Corona",
    name: "Corona — 5.5 x 42",
    basePrice: 3.5,
    tobaccoMultiplier: 0.87,
    description: "Smaller ring gauge with concentrated flavor."
  },
  {
    id: "Gordo",
    name: "Gordo — 6 x 60",
    basePrice: 5.5,
    tobaccoMultiplier: 1.35,
    description: "Longer smoke with more filler capacity."
  },
  {
    id: "Robusto Grande",
    name: "Robusto Grande - 5 * 58",
    basePrice: 4,
    tobaccoMultiplier: 1.3,
    description: "Longer smoke with more filler capacity than your average robusto."
  },
  {
    id: "Presidente",
    name: "Presidente - 7 * 70",
    basePrice: 6,
    tobaccoMultiplier: 1.5,
    description: "Longer smoke with more filler capacity than your average gordo/grande."
  },
  {
    id: "Corona grande",
    name: "Corona Grande - 7 * 42",
    basePrice: 4,
    tobaccoMultiplier: 1.4,
    description: "Longer smoke with more filler capacity than your average Corona."


  }
];

const packDiscounts = {
  1: 0,
  5: 0.03,
  10: 0.06,
  20: 0.12
};

let tobaccos = [];

let fillerBlend = [];
let savedBlends = loadSavedBlends();
let activeCatalogFilter = "all";

const els = {
  ageGate: document.querySelector("#age-gate"),
  ageConfirm: document.querySelector("#age-confirm"),
  ageDeny: document.querySelector("#age-deny"),

  blendName: document.querySelector("#blend-name"),
  cigarSize: document.querySelector("#cigar-size"),
  packSize: document.querySelector("#pack-size"),
  customQuantity: document.querySelector("#custom-quantity"),
  wrapperSelect: document.querySelector("#wrapper-select"),
  binderSelect: document.querySelector("#binder-select"),
  fillerSelect: document.querySelector("#filler-select"),
  fillerPercent: document.querySelector("#filler-percent"),
  addFiller: document.querySelector("#add-filler"),
  fillerList: document.querySelector("#filler-list"),
  fillerTotal: document.querySelector("#filler-total"),
  fillerWarning: document.querySelector("#filler-warning"),

  builderForm: document.querySelector("#builder-form"),
  resetBuilder: document.querySelector("#reset-builder"),

  summaryStrength: document.querySelector("#summary-strength"),
  summaryPrice: document.querySelector("#summary-price"),
  summaryQuantity: document.querySelector("#summary-quantity"),
  summaryOrderTotal: document.querySelector("#summary-order-total"),
  summaryFlavor: document.querySelector("#summary-flavor"),
  summaryOutput: document.querySelector("#summary-output"),

  savedBlends: document.querySelector("#saved-blends"),
  clearSaved: document.querySelector("#clear-saved"),

  catalogGrid: document.querySelector("#catalog-grid"),
  catalogSearch: document.querySelector("#catalog-search"),
  catalogFilters: document.querySelectorAll(".catalog-filter"),

  adminOpen: document.querySelector("#admin-open"),
  adminPanel: document.querySelector("#admin-panel"),
  adminClose: document.querySelector("#admin-close"),
  adminCloseBackdrop: document.querySelector("#admin-close-backdrop"),
  adminLogin: document.querySelector("#admin-login"),
  adminContent: document.querySelector("#admin-content"),
  adminPassword: document.querySelector("#admin-password"),
  adminLoginButton: document.querySelector("#admin-login-button"),
  adminProductForm: document.querySelector("#admin-product-form"),
  adminEditId: document.querySelector("#admin-edit-id"),
  adminProductName: document.querySelector("#admin-product-name"),
  adminProductRole: document.querySelector("#admin-product-role"),
  adminProductOrigin: document.querySelector("#admin-product-origin"),
  adminProductStrength: document.querySelector("#admin-product-strength"),
  adminProductCost: document.querySelector("#admin-product-cost"),
  adminProductStock: document.querySelector("#admin-product-stock"),
  adminProductImage: document.querySelector("#admin-product-image"),
  adminProductFlavor: document.querySelector("#admin-product-flavor"),
  adminProductDescription: document.querySelector("#admin-product-description"),
  adminClearForm: document.querySelector("#admin-clear-form"),
  adminExportProducts: document.querySelector("#admin-export-products"),
  adminResetProducts: document.querySelector("#admin-reset-products"),
  adminProductList: document.querySelector("#admin-product-list"),
  adminProductCount: document.querySelector("#admin-product-count"),

  year: document.querySelector("#year")
};

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD"
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadSavedBlends() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

async function loadSavedBlendsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/api/blends`);

    if (!response.ok) {
      throw new Error("Could not load saved blends.");
    }

    savedBlends = await response.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBlends));
  } catch (error) {
    console.warn("Using browser saved blends because server is unavailable.", error);
    savedBlends = loadSavedBlends();
  }
}

async function saveSavedBlends() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBlends));
}

async function saveBlendToServer(blend) {
  try {
    const response = await fetch(`${API_BASE}/api/blends`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(blend)
    });

    if (!response.ok) {
      throw new Error("Could not save blend to server.");
    }
  } catch (error) {
    console.warn("Blend saved locally, but server save failed.", error);
  }
}

function getTobaccoById(id) {
  return tobaccos.find((tobacco) => tobacco.id === id);
}

function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function loadAdminProducts() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_PRODUCTS_KEY)) || [];
  } catch {
    return [];
  }
}

async function loadAdminProductsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/api/products`);

    if (!response.ok) {
      throw new Error("Could not load products.");
    }

    const products = await response.json();
    localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products));
    return products;
  } catch (error) {
    console.warn("Using browser admin products because server is unavailable.", error);
    return loadAdminProducts();
  }
}

async function saveAdminProducts(products) {
  localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products));
}

async function saveAdminProductToServer(product) {
  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(product)
    });

    if (!response.ok) {
      throw new Error("Could not save product to server.");
    }
  } catch (error) {
    console.warn("Product saved locally, but server save failed.", error);
  }
}

async function deleteAdminProductFromServer(id) {
  try {
    const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not delete product from server.");
    }
  } catch (error) {
    console.warn("Product deleted locally, but server delete failed.", error);
  }
}

async function clearAdminProductsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not clear products from server.");
    }
  } catch (error) {
    console.warn("Products cleared locally, but server clear failed.", error);
  }
}

async function deleteSavedBlendFromServer(id) {
  try {
    const response = await fetch(`${API_BASE}/api/blends/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not delete blend from server.");
    }
  } catch (error) {
    console.warn("Blend deleted locally, but server delete failed.", error);
  }
}

async function clearSavedBlendsFromServer() {
  try {
    const response = await fetch(`${API_BASE}/api/blends`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Could not clear blends from server.");
    }
  } catch (error) {
    console.warn("Blends cleared locally, but server clear failed.", error);
  }
}

function getAdminProducts() {
  return tobaccos.filter((tobacco) => tobacco.isAdminProduct);
}

async function mergeAdminProductsIntoCatalog() {
  const adminProducts = await loadAdminProductsFromServer();

  adminProducts.forEach((product) => {
    const existingIndex = tobaccos.findIndex((tobacco) => tobacco.id === product.id);

    if (existingIndex >= 0) {
      tobaccos[existingIndex] = product;
    } else {
      tobaccos.push(product);
    }
  });
}


function refreshCatalogAndBuilder() {
  populateBuilderOptions();
  renderCatalog();
  renderFillerList();
  renderSavedBlends();
  updateSummary();
}

function stockLabel(tobacco) {
  if (!tobacco || Number(tobacco.stock || 0) <= 0) {
    return "Out of stock";
  }

  if (Number(tobacco.stock || 0) <= 6) {
    return `Low stock: ${tobacco.stock}`;
  }

  return `In stock: ${tobacco.stock}`;
}

function stockClass(tobacco) {
  if (!tobacco || Number(tobacco.stock || 0) <= 0) {
    return "out-of-stock";
  }

  if (Number(tobacco.stock || 0) <= 6) {
    return "low-stock";
  }

  return "in-stock";
}

function roleLabel(role) {
  if (!role) {
    return "Tobacco";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function strengthLabel(score) {
  if (!score) {
    return "—";
  }

  if (score < 2) {
    return "Mild";
  }

  if (score < 3) {
    return "Mild-Medium";
  }

  if (score < 4) {
    return "Medium";
  }

  if (score < 4.6) {
    return "Medium-Full";
  }

  return "Full";
}

function strengthDots(strength) {
  const score = Number(strength || 0);

  return Array.from({ length: 5 })
    .map((_, index) => {
      const active = index < score ? "active" : "";
      return `<span class="strength-dot ${active}"></span>`;
    })
    .join("");
}

function populateSelect(select, items, placeholder) {
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} — ${stockLabel(item)}`;

    if (Number(item.stock || 0) <= 0) {
      option.disabled = true;
    }

    select.appendChild(option);
  });
}

function populateBuilderOptions() {
  els.cigarSize.innerHTML = "";

  cigarSizes.forEach((size) => {
    const option = document.createElement("option");
    option.value = size.id;
    option.textContent = `${size.name} — starts at ${money(size.basePrice)}`;
    els.cigarSize.appendChild(option);
  });

  populateSelect(
    els.wrapperSelect,
    tobaccos.filter((tobacco) => tobacco.role === "wrapper"),
    "Choose wrapper"
  );

  populateSelect(
    els.binderSelect,
    tobaccos.filter((tobacco) => tobacco.role === "binder"),
    "Choose binder"
  );

  populateSelect(
    els.fillerSelect,
    tobaccos.filter((tobacco) => tobacco.role === "filler"),
    "Choose filler"
  );
}

function getSelectedSize() {
  return cigarSizes.find((size) => size.id === els.cigarSize.value) || cigarSizes[0];
}

function getFillerTotal() {
  return fillerBlend.reduce((total, entry) => total + Number(entry.percent || 0), 0);
}

function getSelectedPackQuantity() {
  const packQuantity = Number(els.packSize.value || 1);
  const customQuantity = Number(els.customQuantity.value || 1);

  return Math.max(1, packQuantity * customQuantity);
}

function addFiller() {
  const tobaccoId = els.fillerSelect.value;
  const percent = Number(els.fillerPercent.value || 0);
  const tobacco = getTobaccoById(tobaccoId);

  if (!tobaccoId || !tobacco) {
    alert("Choose a filler tobacco first.");
    return;
  }

  if (Number(tobacco.stock || 0) <= 0) {
    alert("That filler tobacco is out of stock.");
    return;
  }

  if (percent <= 0 || percent > 100) {
    alert("Filler percentage must be between 1 and 100.");
    return;
  }

  const existing = fillerBlend.find((entry) => entry.tobaccoId === tobaccoId);

  if (existing) {
    existing.percent = percent;
  } else {
    fillerBlend.push({
      tobaccoId,
      percent
    });
  }

  els.fillerSelect.value = "";
  els.fillerPercent.value = "25";

  renderFillerList();
  updateSummary();
}

function removeFiller(tobaccoId) {
  fillerBlend = fillerBlend.filter((entry) => entry.tobaccoId !== tobaccoId);
  renderFillerList();
  updateSummary();
}

function renderFillerList() {
  if (!fillerBlend.length) {
    els.fillerList.innerHTML = "";
    return;
  }

  els.fillerList.innerHTML = fillerBlend
    .map((entry) => {
      const tobacco = getTobaccoById(entry.tobaccoId);

      return `
        <li class="filler-item">
          <div class="filler-item-main">
            <img
              class="filler-item-image"
              src="${escapeHtml(tobacco ? tobacco.image : "")}"
              alt="${escapeHtml(tobacco ? tobacco.name : "Tobacco")}"
            />
            <div>
              <strong>${escapeHtml(tobacco ? tobacco.name : "Unknown tobacco")}</strong>
              <span class="stock-badge ${stockClass(tobacco)}">${escapeHtml(stockLabel(tobacco))}</span>
            </div>
          </div>
          <span>${entry.percent}%</span>
          <button class="remove-filler" type="button" onclick="removeFiller('${entry.tobaccoId}')">Remove</button>
        </li>
      `;
    })
    .join("");
}

function catalogMatchesFilter(tobacco) {
  if (activeCatalogFilter === "all") {
    return true;
  }

  if (activeCatalogFilter === "in-stock") {
    return Number(tobacco.stock || 0) > 0;
  }

  return tobacco.role === activeCatalogFilter;
}

function catalogMatchesSearch(tobacco) {
  const query = (els.catalogSearch?.value || "").trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    tobacco.name,
    tobacco.role,
    tobacco.origin,
    tobacco.flavor,
    tobacco.description
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function renderCatalog() {
  if (!els.catalogGrid) {
    return;
  }

  const filteredTobaccos = tobaccos.filter((tobacco) => {
    return catalogMatchesFilter(tobacco) && catalogMatchesSearch(tobacco);
  });

  if (!filteredTobaccos.length) {
    els.catalogGrid.innerHTML = `
      <div class="catalog-empty">
        No tobaccos match that filter or search.
      </div>
    `;
    return;
  }

  els.catalogGrid.innerHTML = filteredTobaccos
    .map((tobacco) => {
      const available = Number(tobacco.stock || 0) > 0;

      return `
        <article class="catalog-card">
          <div class="catalog-image-wrap">
            <img src="${escapeHtml(tobacco.image)}" alt="${escapeHtml(tobacco.name)}" />
            <span class="catalog-role-pill">${escapeHtml(roleLabel(tobacco.role))}</span>
          </div>

          <div class="catalog-card-body">
            <h3>${escapeHtml(tobacco.name)}</h3>
            <p class="catalog-description">${escapeHtml(tobacco.description || "")}</p>

            <span class="stock-badge ${stockClass(tobacco)}">${escapeHtml(stockLabel(tobacco))}</span>

            <div class="catalog-meta-grid">
              <div class="catalog-meta">
                <span>Origin</span>
                <strong>${escapeHtml(tobacco.origin)}</strong>
              </div>

              <div class="catalog-meta">
                <span>Cost Estimate</span>
                <strong>${money(tobacco.cost)}</strong>
              </div>

              <div class="catalog-meta">
                <span>Role</span>
                <strong>${escapeHtml(roleLabel(tobacco.role))}</strong>
              </div>

              <div class="catalog-meta">
                <span>Strength</span>
                <strong>${strengthLabel(tobacco.strength)}</strong>
                <div class="strength-meter">${strengthDots(tobacco.strength)}</div>
              </div>
            </div>

            <p class="catalog-flavor">
              <strong>Flavor:</strong> ${escapeHtml(tobacco.flavor)}
            </p>

            <div class="catalog-card-footer">
              <button
                type="button"
                class="btn secondary ${available ? "" : "disabled"}"
                ${available ? "" : "disabled"}
                onclick="useCatalogTobacco('${tobacco.id}')"
              >
                Use in Builder
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function useCatalogTobacco(tobaccoId) {
  const tobacco = getTobaccoById(tobaccoId);

  if (!tobacco || Number(tobacco.stock || 0) <= 0) {
    return;
  }

  if (tobacco.role === "wrapper") {
    els.wrapperSelect.value = tobacco.id;
  }

  if (tobacco.role === "binder") {
    els.binderSelect.value = tobacco.id;
  }

  if (tobacco.role === "filler") {
    els.fillerSelect.value = tobacco.id;
  }

  updateSummary();

  document.querySelector("#builder")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function setupCatalogFilters() {
  els.catalogFilters.forEach((button) => {
    button.addEventListener("click", () => {
      activeCatalogFilter = button.dataset.catalogFilter || "all";

      els.catalogFilters.forEach((filterButton) => {
        filterButton.classList.toggle("active", filterButton === button);
      });

      renderCatalog();
    });
  });

  els.catalogSearch?.addEventListener("input", renderCatalog);
}

function calculateBlend() {
  const size = getSelectedSize();
  const wrapper = getTobaccoById(els.wrapperSelect.value);
  const binder = getTobaccoById(els.binderSelect.value);
  const fillerTotal = getFillerTotal();
  const packQuantity = Number(els.packSize.value || 1);
  const orderQuantity = getSelectedPackQuantity();
  const discount = Number(packDiscounts[packQuantity] || 0);

  let price = size.basePrice;
  let strengthScore = 0;
  let strengthWeight = 0;
  const flavors = [];

  if (wrapper) {
    price += wrapper.cost * size.tobaccoMultiplier;
    strengthScore += wrapper.strength * 0.3;
    strengthWeight += 0.3;
    flavors.push(wrapper.flavor);
  }

  if (binder) {
    price += binder.cost * size.tobaccoMultiplier;
    strengthScore += binder.strength * 0.2;
    strengthWeight += 0.2;
    flavors.push(binder.flavor);
  }

  fillerBlend.forEach((entry) => {
    const tobacco = getTobaccoById(entry.tobaccoId);

    if (!tobacco) {
      return;
    }

    const ratio = Number(entry.percent || 0) / 100;
    price += tobacco.cost * ratio * 2.2 * size.tobaccoMultiplier;
    strengthScore += tobacco.strength * ratio * 0.5;
    strengthWeight += ratio * 0.5;
    flavors.push(tobacco.flavor);
  });

  const discountedUnitPrice = price * (1 - discount);
  const orderTotal = discountedUnitPrice * orderQuantity;
  const normalizedStrength = strengthWeight > 0 ? strengthScore / strengthWeight : 0;

  return {
    size,
    wrapper,
    binder,
    fillerTotal,
    price: discountedUnitPrice,
    originalUnitPrice: price,
    orderQuantity,
    orderTotal,
    discount,
    strength: normalizedStrength,
    flavors
  };
}

function updateSummary() {
  const result = calculateBlend();

  els.fillerTotal.textContent = `${result.fillerTotal}%`;
  els.fillerTotal.classList.toggle("good", result.fillerTotal === 100);
  els.fillerTotal.classList.toggle("bad", result.fillerTotal !== 100 && result.fillerTotal > 0);

  if (result.fillerTotal === 0) {
    els.fillerWarning.textContent = "Add filler tobaccos to complete the blend.";
  } else if (result.fillerTotal !== 100) {
    els.fillerWarning.textContent = "Filler percentages should total exactly 100%.";
  } else {
    els.fillerWarning.textContent = "";
  }

  els.summaryStrength.textContent = strengthLabel(result.strength);
  els.summaryPrice.textContent = money(result.price);
  els.summaryQuantity.textContent = `${result.orderQuantity} cigar${result.orderQuantity === 1 ? "" : "s"}`;
  els.summaryOrderTotal.textContent = money(result.orderTotal);

  const flavorText = result.flavors.length
    ? result.flavors.slice(0, 4).join(" • ")
    : "Choose tobaccos to begin.";

  els.summaryFlavor.textContent = flavorText;

  const fillerLines = fillerBlend.map((entry) => {
    const tobacco = getTobaccoById(entry.tobaccoId);
    return `- ${tobacco ? tobacco.name : "Unknown"}: ${entry.percent}%`;
  });

  const discountLine = result.discount > 0
    ? `Pack discount: ${(result.discount * 100).toFixed(0)}%`
    : "Pack discount: None";

  els.summaryOutput.textContent = [
    `Size: ${result.size.name}`,
    `Wrapper: ${result.wrapper ? result.wrapper.name : "Not selected"}`,
    `Binder: ${result.binder ? result.binder.name : "Not selected"}`,
    "Filler:",
    fillerLines.length ? fillerLines.join("\n") : "- None selected",
    "",
    `Quantity: ${result.orderQuantity}`,
    discountLine,
    `Unit estimate: ${money(result.price)}`,
    `Order estimate: ${money(result.orderTotal)}`
  ].join("\n");
}

async function saveCurrentBlend(event) {
  event.preventDefault();

  const result = calculateBlend();
  const name = els.blendName.value.trim();

  if (!name) {
    alert("Please name your blend.");
    return;
  }

  if (!result.wrapper) {
    alert("Please choose a wrapper.");
    return;
  }

  if (!result.binder) {
    alert("Please choose a binder.");
    return;
  }

  if (result.fillerTotal !== 100) {
    alert("Filler percentages must total 100% before saving.");
    return;
  }

  const blend = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name,
    sizeId: result.size.id,
    packSize: Number(els.packSize.value || 1),
    customQuantity: Number(els.customQuantity.value || 1),
    orderQuantity: result.orderQuantity,
    wrapperId: result.wrapper.id,
    binderId: result.binder.id,
    fillers: structuredClone(fillerBlend),
    estimatedUnitPrice: result.price,
    estimatedOrderTotal: result.orderTotal,
    estimatedStrength: strengthLabel(result.strength),
    createdAt: new Date().toISOString()
  };

  savedBlends.unshift(blend);
  await saveSavedBlends();
  await saveBlendToServer(blend);
  renderSavedBlends();

  alert(`Saved blend permanently: ${name}`);
}

function renderSavedBlends() {
  if (!savedBlends.length) {
    els.savedBlends.innerHTML = `
      <div class="saved-card">
        <h3>No saved blends yet</h3>
        <p>Build your first cigar blend and save it here.</p>
      </div>
    `;
    return;
  }

  els.savedBlends.innerHTML = savedBlends
    .map((blend) => {
      const size = cigarSizes.find((item) => item.id === blend.sizeId);
      const wrapper = getTobaccoById(blend.wrapperId);
      const binder = getTobaccoById(blend.binderId);

      const fillerText = blend.fillers
        .map((entry) => {
          const tobacco = getTobaccoById(entry.tobaccoId);
          return `- ${tobacco ? tobacco.name : "Unknown"}: ${entry.percent}%`;
        })
        .join("\n");

      return `
        <article class="saved-card">
          <h3>${escapeHtml(blend.name)}</h3>

          <div class="saved-card-meta">
            <span>${escapeHtml(blend.estimatedStrength)}</span>
            <span>${blend.orderQuantity || 1} cigar${Number(blend.orderQuantity || 1) === 1 ? "" : "s"}</span>
            <span>${money(blend.estimatedOrderTotal || blend.estimatedPrice || 0)}</span>
          </div>

          <p>
Size: ${escapeHtml(size ? size.name : "Unknown")}
Pack size: ${escapeHtml(blend.packSize || 1)}
Wrapper: ${escapeHtml(wrapper ? wrapper.name : "Unknown")}
Binder: ${escapeHtml(binder ? binder.name : "Unknown")}
Filler:
${escapeHtml(fillerText)}
          </p>

          <p>
Estimated Unit Price: ${money(blend.estimatedUnitPrice || blend.estimatedPrice || 0)}
Estimated Order Total: ${money(blend.estimatedOrderTotal || blend.estimatedPrice || 0)}
          </p>

          <button class="btn ghost" type="button" onclick="deleteSavedBlend('${blend.id}')">Delete</button>
        </article>
      `;
    })
    .join("");
}



function resetBuilder() {
  els.blendName.value = "";
  els.cigarSize.value = cigarSizes[0].id;
  els.packSize.value = "1";
  els.customQuantity.value = "1";
  els.wrapperSelect.value = "";
  els.binderSelect.value = "";
  els.fillerSelect.value = "";
  els.fillerPercent.value = "25";
  fillerBlend = [];
  renderFillerList();
  updateSummary();
}

async function deleteSavedBlend(id) {
  if (!confirm("Delete this saved blend?")) {
    return;
  }

  savedBlends = savedBlends.filter((blend) => blend.id !== id);
  await saveSavedBlends();
  await deleteSavedBlendFromServer(id);
  renderSavedBlends();
}

async function clearSavedBlends() {
  if (!confirm("Clear all saved blends?")) {
    return;
  }

  savedBlends = [];
  await saveSavedBlends();
  await clearSavedBlendsFromServer();
  renderSavedBlends();
}

function openAdminPanel() {
  els.adminPanel.classList.remove("hidden");
  els.adminPassword.value = "";
  els.adminPassword.focus();
}

function closeAdminPanel() {
  els.adminPanel.classList.add("hidden");
}

function unlockAdminMode() {
  const password = els.adminPassword.value;

  if (password !== ADMIN_PASSWORD) {
    alert("Incorrect admin password.");
    return;
  }

  els.adminLogin.classList.add("hidden");
  els.adminContent.classList.remove("hidden");
  clearAdminForm();
  renderAdminProductList();
}

function clearAdminForm() {
  els.adminEditId.value = "";
  els.adminProductName.value = "";
  els.adminProductRole.value = "wrapper";
  els.adminProductOrigin.value = "";
  els.adminProductStrength.value = "3";
  els.adminProductCost.value = "1.00";
  els.adminProductStock.value = "10";
  els.adminProductImage.value = "";
  els.adminProductFlavor.value = "";
  els.adminProductDescription.value = "";
}

function collectAdminProductFromForm() {
  const name = els.adminProductName.value.trim();
  const role = els.adminProductRole.value;
  const origin = els.adminProductOrigin.value.trim();
  const strength = Number(els.adminProductStrength.value || 3);
  const cost = Number(els.adminProductCost.value || 0);
  const stock = Number(els.adminProductStock.value || 0);
  const image = els.adminProductImage.value.trim() || FALLBACK_TOBACCO_IMAGE;
  const flavor = els.adminProductFlavor.value.trim();
  const description = els.adminProductDescription.value.trim();

  if (!name) {
    alert("Please enter a tobacco name.");
    return null;
  }

  if (!["wrapper", "binder", "filler"].includes(role)) {
    alert("Choose wrapper, binder, or filler.");
    return null;
  }

  if (strength < 1 || strength > 5) {
    alert("Strength must be between 1 and 5.");
    return null;
  }

  if (cost < 0 || stock < 0) {
    alert("Cost and stock cannot be negative.");
    return null;
  }

  const existingId = els.adminEditId.value;
  const id = existingId || `admin-${role}-${makeSlug(name)}-${Date.now()}`;

  return {
    id,
    name,
    role,
    origin,
    strength,
    cost,
    stock,
    image,
    flavor,
    description,
    isAdminProduct: true
  };
}

async function saveAdminProduct(event) {
  event.preventDefault();

  const product = collectAdminProductFromForm();

  if (!product) {
    return;
  }

  const adminProducts = loadAdminProducts();
  const existingIndex = adminProducts.findIndex((item) => item.id === product.id);

  if (existingIndex >= 0) {
    adminProducts[existingIndex] = product;
  } else {
    adminProducts.push(product);
  }

  await saveAdminProducts(adminProducts);
  await saveAdminProductToServer(product);

  const catalogIndex = tobaccos.findIndex((item) => item.id === product.id);

  if (catalogIndex >= 0) {
    tobaccos[catalogIndex] = product;
  } else {
    tobaccos.push(product);
  }

  refreshCatalogAndBuilder();
  renderAdminProductList();
  clearAdminForm();

  alert(`Saved tobacco product permanently: ${product.name}`);
}

function editAdminProduct(id) {
  const product = getTobaccoById(id);

  if (!product || !product.isAdminProduct) {
    return;
  }

  els.adminEditId.value = product.id;
  els.adminProductName.value = product.name || "";
  els.adminProductRole.value = product.role || "wrapper";
  els.adminProductOrigin.value = product.origin || "";
  els.adminProductStrength.value = product.strength || "3";
  els.adminProductCost.value = product.cost || "0";
  els.adminProductStock.value = product.stock || "0";
  els.adminProductImage.value = product.image || "";
  els.adminProductFlavor.value = product.flavor || "";
  els.adminProductDescription.value = product.description || "";

  els.adminProductName.focus();
}



function renderAdminProductList() {
  const adminProducts = getAdminProducts();

  els.adminProductCount.textContent = `${adminProducts.length} product${adminProducts.length === 1 ? "" : "s"}`;

  if (!adminProducts.length) {
    els.adminProductList.innerHTML = `
      <div class="catalog-empty">
        No custom admin products yet. Add your first tobacco product above.
      </div>
    `;
    return;
  }

  els.adminProductList.innerHTML = adminProducts
    .map((product) => {
      return `
        <article class="admin-product-item">
          <img src="${escapeHtml(product.image || FALLBACK_TOBACCO_IMAGE)}" alt="${escapeHtml(product.name)}" />

          <div>
            <h4>${escapeHtml(product.name)}</h4>
            <p>
              ${escapeHtml(roleLabel(product.role))}
              • ${escapeHtml(product.origin || "Unknown origin")}
              • ${escapeHtml(stockLabel(product))}
              • ${money(product.cost)}
            </p>
            <p>${escapeHtml(product.flavor || "No flavor notes listed.")}</p>
          </div>

          <div class="admin-product-actions">
            <button class="admin-mini-button" type="button" onclick="editAdminProduct('${product.id}')">Edit</button>
            <button class="admin-mini-button delete" type="button" onclick="deleteAdminProduct('${product.id}')">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function exportAdminProducts() {
  const adminProducts = loadAdminProducts();
  const json = JSON.stringify(adminProducts, null, 2);

  navigator.clipboard
    .writeText(json)
    .then(() => {
      alert("Custom product JSON copied to clipboard.");
    })
    .catch(() => {
      console.log(json);
      alert("Could not copy automatically. Product JSON was printed in the browser console.");
    });
}

async function deleteAdminProduct(id) {
  const product = getTobaccoById(id);

  if (!product || !product.isAdminProduct) {
    return;
  }

  if (!confirm(`Delete "${product.name}" from custom admin products?`)) {
    return;
  }

  const adminProducts = loadAdminProducts().filter((item) => item.id !== id);
  await saveAdminProducts(adminProducts);
  await deleteAdminProductFromServer(id);

  tobaccos = tobaccos.filter((item) => item.id !== id);
  refreshCatalogAndBuilder();
  renderAdminProductList();
}

async function resetAdminProducts() {
  if (!confirm("Delete all custom admin products? This cannot be undone.")) {
    return;
  }

  localStorage.removeItem(ADMIN_PRODUCTS_KEY);
  await clearAdminProductsFromServer();

  tobaccos = tobaccos.filter((item) => !item.isAdminProduct);
  refreshCatalogAndBuilder();
  renderAdminProductList();
  clearAdminForm();
}



function setupAdminMode() {
  els.adminOpen.addEventListener("click", openAdminPanel);
  els.adminClose.addEventListener("click", closeAdminPanel);
  els.adminCloseBackdrop.addEventListener("click", closeAdminPanel);
  els.adminLoginButton.addEventListener("click", unlockAdminMode);
  els.adminProductForm.addEventListener("submit", saveAdminProduct);
  els.adminClearForm.addEventListener("click", clearAdminForm);
  els.adminExportProducts.addEventListener("click", exportAdminProducts);
  els.adminResetProducts.addEventListener("click", resetAdminProducts);

  els.adminPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockAdminMode();
    }
  });
}

function setupAgeGate() {
  if (localStorage.getItem(AGE_KEY) === "yes") {
    els.ageGate.classList.add("hidden");
  }

  els.ageConfirm.addEventListener("click", () => {
    localStorage.setItem(AGE_KEY, "yes");
    els.ageGate.classList.add("hidden");
  });

  els.ageDeny.addEventListener("click", () => {
    document.body.innerHTML = `
      <main style="min-height: 100vh; display: grid; place-items: center; background: #120d09; color: #fff4e8; font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <section>
          <h1>Access Denied</h1>
          <p>You must be of legal age to view this content.</p>
        </section>
      </main>
    `;
  });
}

async function init() {
  setupAgeGate();
  await loadSavedBlendsFromServer();
  await mergeAdminProductsIntoCatalog();
  populateBuilderOptions();
  setupCatalogFilters();
  setupAdminMode();
  renderFillerList();
  renderCatalog();
  renderSavedBlends();
  updateSummary();

  els.year.textContent = new Date().getFullYear();

  els.addFiller.addEventListener("click", addFiller);
  els.builderForm.addEventListener("submit", saveCurrentBlend);
  els.resetBuilder.addEventListener("click", resetBuilder);
  els.clearSaved.addEventListener("click", clearSavedBlends);

  [
    els.cigarSize,
    els.packSize,
    els.customQuantity,
    els.wrapperSelect,
    els.binderSelect,
    els.fillerPercent
  ].forEach((element) => {
    element.addEventListener("input", updateSummary);
    element.addEventListener("change", updateSummary);

  });
}

init();