// ===== DEMO USER SETUP =====
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// Create demo user if not exists
async function createDemoUser() {
    if (!localStorage.getItem("users")) {
        const hashed = await hashPassword("RiseSecure123!");
        const users = [{ username: "admin", password: hashed }];
        localStorage.setItem("users", JSON.stringify(users));
    }
}

// ===== LOGIN SYSTEM =====
document.getElementById("loginBtn").addEventListener("click", async () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const hashedInput = await hashPassword(password);

    const validUser = users.find(
        u => u.username === username && u.password === hashedInput
    );

    if (validUser) {
        localStorage.setItem("loggedIn", "true");
        showDashboard();
    } else {
        document.getElementById("loginError").innerText = "Invalid credentials";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("loggedIn");
    location.reload();
});

function showDashboard() {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
}

// ===== INVENTORY SYSTEM =====
document.getElementById("addItemBtn").addEventListener("click", () => {
    const name = document.getElementById("itemName").value;
    const qty = document.getElementById("itemQty").value;

    if (!name || !qty) return;

    const inventory = JSON.parse(localStorage.getItem("inventory")) || [];
    inventory.push({ name, qty });

    localStorage.setItem("inventory", JSON.stringify(inventory));
    renderInventory();
});

function renderInventory() {
    const list = document.getElementById("inventoryList");
    list.innerHTML = "";

    const inventory = JSON.parse(localStorage.getItem("inventory")) || [];

    inventory.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} - ${item.qty}`;
        list.appendChild(li);
    });
}

// ===== INIT =====
async function init() {
    await createDemoUser();

    if (localStorage.getItem("loggedIn") === "true") {
        showDashboard();
        renderInventory();
    }
}

init();

// Init
renderInventory();
