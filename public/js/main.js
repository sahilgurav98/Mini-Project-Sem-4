// Calculate total dynamically on Student Dashboard
function calcTotal() {
    let total = 0;
    const rows = document.querySelectorAll('#menu-items tr');
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
    const rows = document.querySelectorAll('#menu-items tr');

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
            setTimeout(() => location.reload(), 1500); // Reload to show updated history
        } else {
            msgDiv.innerHTML = `<div class="alert alert-danger rounded-0 border-dark">${data.message}</div>`;
        }
    } catch (err) {
        console.error(err);
    }
}