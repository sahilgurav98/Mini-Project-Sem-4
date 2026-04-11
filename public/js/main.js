// Calculate total dynamically on Student Dashboard
function getMenuRows() {
    const cardRows = document.querySelectorAll('#menu-items .menu-row');
    if (cardRows.length > 0) return cardRows;
    return document.querySelectorAll('#menu-items tr');
}

function calcTotal() {
    let total = 0;
    const rows = getMenuRows();
    rows.forEach(row => {
        const price = parseFloat(row.querySelector('.item-price').innerText);
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        total += price * qty;
    });
    document.getElementById('grandTotal').innerText = total;
}

// AJAX Order Submission
async function submitOrder() {
    const cartItems = [];
    const rows = getMenuRows();

    rows.forEach(row => {
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        if (qty > 0) {
            cartItems.push({
                itemName: row.querySelector('.item-name').innerText,
                price: parseFloat(row.querySelector('.item-price').innerText),
                quantity: qty
            });
        }
    });

    if (cartItems.length === 0) return alert("Select at least one item!");

    const totalAmount = parseFloat(document.getElementById('grandTotal').innerText);

    try {
        const res = await fetch('/student/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartItems, totalAmount })
        });
        const data = await res.json();

        const msgDiv = document.getElementById('order-msg');
        if (data.success) {
            msgDiv.innerHTML = `<div class="alert alert-success rounded-0 border-dark">${data.message}</div>`;
            if (typeof window.fetchStudentOrders === 'function') {
                await window.fetchStudentOrders();
            }
            if (typeof window.fetchActiveCoupons === 'function') {
                await window.fetchActiveCoupons();
            }
            if (typeof window.refreshQueueStatus === 'function') {
                await window.refreshQueueStatus();
            }
            rows.forEach(row => {
                const qtyInput = row.querySelector('.item-qty');
                if (qtyInput) qtyInput.value = 0;
            });
            calcTotal();
        } else {
            msgDiv.innerHTML = `<div class="alert alert-danger rounded-0 border-dark">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
    }
}

// ==========================================
// PWA & Service Worker Registration Logic
// ==========================================
let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully!', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Show the custom install button in the UI
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.classList.remove('d-none');
    }
});

async function installPWA() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    
    // Hide the button once installed
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.style.display = 'none';
        installBtn.classList.add('d-none');
    }
}
