const STORAGE_KEY = "rise_inventory_v2";
const USERS_KEY = "rise_users_v1";
const SESSION_KEY = "rise_session_v1";
const TRANSACTIONS_KEY = "rise_transactions_v1";

// ---------- DOM ----------
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserDisplay = document.getElementById("currentUserDisplay");
const roleBadge = document.getElementById("roleBadge");
const permissionMessage = document.getElementById("permissionMessage");

const tbody = document.getElementById("inventoryTbody");
const addBookBtn = document.getElementById("addBookBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const bookModalEl = document.getElementById("bookModal");
const bookModal = new bootstrap.Modal(bookModalEl);
const modalTitle = document.getElementById("modalTitle");
const bookForm = document.getElementById("bookForm");
const bookId = document.getElementById("bookId");
const titleInput = document.getElementById("titleInput");
const authorInput = document.getElementById("authorInput");
const isbnInput = document.getElementById("isbnInput");
const conditionInput = document.getElementById("conditionInput");
const priceInput = document.getElementById("priceInput");
const quantityInput = document.getElementById("quantityInput");

const purchaseModalEl = document.getElementById("purchaseModal");
const purchaseModal = new bootstrap.Modal(purchaseModalEl);
const purchaseForm = document.getElementById("purchaseForm");
const purchaseBookId = document.getElementById("purchaseBookId");
const purchaseBookTitle = document.getElementById("purchaseBookTitle");
const purchaseQtyInput = document.getElementById("purchaseQtyInput");
const availableQtyText = document.getElementById("availableQtyText");
const transactionTbody = document.getElementById("transactionTbody");
const accountingSummary = document.getElementById("accountingSummary");

// ---------- STATE ----------
let inventory = loadInventory();
let currentFilter = "";
let currentUser = null;

// ---------- ROLE PERMISSIONS ----------
const ROLE_PERMISSIONS = {
    Admin: {
        canView: true,
        canSearch: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canPurchase: true
    },
    Manager: {
        canView: true,
        canSearch: true,
        canAdd: true,
        canEdit: true,
        canDelete: false,
        canPurchase: true
    },
    Sales: {
        canView: true,
        canSearch: true,
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canPurchase: true
    }
};

// ---------- AUTH HELPERS ----------
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function seedUsers() {
    const existing = localStorage.getItem(USERS_KEY);
    if (existing) return;

    const users = [
        {
            username: "admin",
            password: await hashPassword("Admin123!"),
            role: "Admin"
        },
        {
            username: "manager",
            password: await hashPassword("Manager123!"),
            role: "Manager"
        },
        {
            username: "sales",
            password: await hashPassword("Sales123!"),
            role: "Sales"
        }
    ];

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getPermissions() {
    if (!currentUser) return null;
    return ROLE_PERMISSIONS[currentUser.role] || null;
}

function requirePermission(permissionName) {
    const permissions = getPermissions();
    return permissions && permissions[permissionName] === true;
}

// ---------- STORAGE ----------
function loadInventory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            const seeded = seedInventory();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
            return seeded;
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveInventory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

function seedInventory() {
    return [
        {
            id: crypto.randomUUID(),
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "978-0743273565",
            condition: "Rare",
            price: 450.00,
            quantity: 3
        },
        {
            id: crypto.randomUUID(),
            title: "1984",
            author: "George Orwell",
            isbn: "978-0451524935",
            condition: "Standard",
            price: 18.99,
            quantity: 10
        }
    ];
}

// ---------- AUTH ----------
async function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        loginError.textContent = "Please enter both username and password.";
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const hashedPassword = await hashPassword(password);

    const matchedUser = users.find(user =>
        user.username === username && user.password === hashedPassword
    );

    if (!matchedUser) {
        loginError.textContent = "Invalid username or password.";
        return;
    }

    currentUser = {
        username: matchedUser.username,
        role: matchedUser.role
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    loginError.textContent = "";
    showDashboard();
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;

    loginSection.classList.remove("d-none");
    dashboardSection.classList.add("d-none");
    logoutBtn.classList.add("d-none");

    currentUserDisplay.textContent = "";
    roleBadge.textContent = "";
    usernameInput.value = "";
    passwordInput.value = "";
}

function restoreSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;

    try {
        currentUser = JSON.parse(session);
        return !!currentUser;
    } catch {
        localStorage.removeItem(SESSION_KEY);
        return false;
    }
}

// ---------- UI ----------
function showDashboard() {
    loginSection.classList.add("d-none");
    dashboardSection.classList.remove("d-none");
    logoutBtn.classList.remove("d-none");

    currentUserDisplay.textContent = `Signed in: ${currentUser.username}`;
    roleBadge.textContent = currentUser.role;

    applyRoleUI();
    renderInventory();
}

function applyRoleUI() {
    const permissions = getPermissions();
    if (!permissions) return;

    addBookBtn.classList.toggle("d-none", !permissions.canAdd);

    if (currentUser.role === "Sales") {
        permissionMessage.textContent = "Sales users can view, search, and complete purchase transactions.";
    } else if (currentUser.role === "Manager") {
        permissionMessage.textContent = "Managers can add, edit, and process purchases, but cannot delete books.";
    } else {
        permissionMessage.textContent = "Admins have full inventory access.";
    }

    permissionMessage.classList.remove("d-none");
}

// ---------- RENDER ----------
function renderInventory() {
    if (!requirePermission("canView")) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">Access denied.</td>
            </tr>
        `;
        return;
    }

    const filtered = inventory.filter(book => {
        if (!currentFilter) return true;
        const q = currentFilter.toLowerCase();
        return (
            book.title.toLowerCase().includes(q) ||
            book.author.toLowerCase().includes(q) ||
            book.isbn.toLowerCase().includes(q)
        );
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">No books found.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(renderRow).join("");
}

function renderRow(book) {
    const badge = (book.condition === "Rare" || book.condition === "Special")
        ? `<span class="status-badge">${escapeHtml(book.condition)}</span>`
        : `<span class="badge bg-secondary">${escapeHtml(book.condition)}</span>`;

    const actions = [];

    if (requirePermission("canEdit")) {
        actions.push(`<button class="btn btn-sm btn-outline-primary" data-action="edit">Edit</button>`);
    }

    if (requirePermission("canDelete")) {
        actions.push(`<button class="btn btn-sm btn-outline-danger ms-2" data-action="delete">Delete</button>`);
    }

    if (requirePermission("canPurchase")) {
        actions.push(`<button class="btn btn-sm btn-outline-success ms-2" data-action="purchase">Purchase</button>`);
    }

    if (actions.length === 0) {
        actions.push(`<span class="text-muted small">View only</span>`);
    }

    return `
        <tr data-id="${book.id}">
            <td>
                <div class="book-placeholder">X</div>
            </td>
            <td>
                <strong>${escapeHtml(book.title)}</strong><br>
                <small class="text-muted">${escapeHtml(book.author)}</small>
            </td>
            <td>${escapeHtml(book.isbn)}</td>
            <td>${badge}</td>
            <td>${formatMoney(book.price)}</td>
            <td>${book.quantity}</td>
            <td>${actions.join("")}</td>
        </tr>
    `;
}

// ---------- CRUD ----------
function openAddModal() {
    if (!requirePermission("canAdd")) {
        alert("You do not have permission to add books.");
        return;
    }

    modalTitle.textContent = "Add Book";
    bookId.value = "";
    bookForm.reset();
    conditionInput.value = "Standard";
    quantityInput.value = 1;
    bookModal.show();
}

function openEditModal(book) {
    if (!requirePermission("canEdit")) {
        alert("You do not have permission to edit books.");
        return;
    }

    modalTitle.textContent = "Edit Book";
    bookId.value = book.id;
    titleInput.value = book.title;
    authorInput.value = book.author;
    isbnInput.value = book.isbn;
    conditionInput.value = book.condition;
    priceInput.value = book.price;
    quantityInput.value = book.quantity;
    bookModal.show();
}

function upsertBook(formData) {
    const title = formData.title.trim();
    const author = formData.author.trim();
    const isbn = formData.isbn.trim();
    const condition = formData.condition;
    const price = Number(formData.price);
    const quantity = Number(formData.quantity);

    if (!title || !author || !isbn) {
        alert("Title, Author, and ISBN are required.");
        return;
    }

    if (!Number.isFinite(price) || price < 0) {
        alert("Price must be a valid non-negative number.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
        alert("Quantity must be a valid non-negative whole number.");
        return;
    }

    const existing = inventory.find(book => book.isbn === isbn);
    if (existing && existing.id !== formData.id) {
        alert("A book with this ISBN already exists.");
        return;
    }

    if (formData.id) {
        if (!requirePermission("canEdit")) {
            alert("You do not have permission to edit books.");
            return;
        }

        inventory = inventory.map(book =>
            book.id === formData.id
                ? { ...book, title, author, isbn, condition, price, quantity }
                : book
        );
    } else {
        if (!requirePermission("canAdd")) {
            alert("You do not have permission to add books.");
            return;
        }

        inventory.unshift({
            id: crypto.randomUUID(),
            title,
            author,
            isbn,
            condition,
            price,
            quantity
        });
    }

    saveInventory();
    renderInventory();
    bookModal.hide();
}

function deleteBook(id) {
    if (!requirePermission("canDelete")) {
        alert("You do not have permission to delete books.");
        return;
    }

    const book = inventory.find(item => item.id === id);
    if (!book) return;

    const confirmed = confirm(`Delete "${book.title}"? This cannot be undone.`);
    if (!confirmed) return;

    inventory = inventory.filter(item => item.id !== id);
    saveInventory();
    renderInventory();
}

// ---------- PURCHASE TRANSACTION ----------
function openPurchaseModal(book) {
    if (!requirePermission("canPurchase")) {
        alert("You do not have permission to process purchases.");
        return;
    }

    purchaseBookId.value = book.id;
    purchaseBookTitle.textContent = `${book.title} by ${book.author}`;
    purchaseQtyInput.value = 1;
    purchaseQtyInput.max = book.quantity;
    availableQtyText.textContent = `Available quantity: ${book.quantity}`;

    purchaseModal.show();
}

function completePurchase(bookIdValue, purchaseQty) {
    if (!requirePermission("canPurchase")) {
        alert("You do not have permission to process purchases.");
        return;
    }

    const qty = Number(purchaseQty);

    if (!Number.isInteger(qty) || qty <= 0) {
        alert("Purchase quantity must be a whole number greater than zero.");
        return;
    }

    const book = inventory.find(item => item.id === bookIdValue);
    if (!book) {
        alert("Book not found.");
        return;
    }

    if (qty > book.quantity) {
        alert("Not enough inventory available for this purchase.");
        return;
    }

    inventory = inventory.map(item =>
        item.id === bookIdValue
            ? { ...item, quantity: item.quantity - qty }
            : item
    );

    saveInventory();
    renderInventory();
    purchaseModal.hide();

    alert(`Purchase completed. ${qty} copy/copies sold.`);
}

// ---------- EVENTS ----------
loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
});

logoutBtn.addEventListener("click", logout);

addBookBtn.addEventListener("click", openAddModal);

searchBtn.addEventListener("click", () => {
    if (!requirePermission("canSearch")) return;
    currentFilter = searchInput.value.trim();
    renderInventory();
});

searchInput.addEventListener("input", () => {
    if (!requirePermission("canSearch")) return;
    currentFilter = searchInput.value.trim();
    renderInventory();
});

bookForm.addEventListener("submit", event => {
    event.preventDefault();

    upsertBook({
        id: bookId.value || "",
        title: titleInput.value,
        author: authorInput.value,
        isbn: isbnInput.value,
        condition: conditionInput.value,
        price: priceInput.value,
        quantity: quantityInput.value
    });
});

purchaseForm.addEventListener("submit", event => {
    event.preventDefault();
    completePurchase(purchaseBookId.value, purchaseQtyInput.value);
});

tbody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = event.target.closest("tr[data-id]");
    if (!row) return;

    const id = row.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    const book = inventory.find(item => item.id === id);

    if (!book) return;

    if (action === "edit") {
        openEditModal(book);
    } else if (action === "delete") {
        deleteBook(id);
    } else if (action === "purchase") {
        openPurchaseModal(book);
    }
});

// ---------- UTILITIES ----------
function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(Number(value) || 0);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[char]));
}

// ---------- INIT ----------
async function init() {
    await seedUsers();

    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedInventory()));
    }

    inventory = loadInventory();

    if (restoreSession()) {
        showDashboard();
    } else {
        loginSection.classList.remove("d-none");
        dashboardSection.classList.add("d-none");
    }
}

init();
