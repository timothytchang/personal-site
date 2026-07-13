// Password gate for the unlisted #zermatt1 draft essay.
// The essay ships in zermatt1.enc as base64(salt ‖ iv ‖ AES-256-GCM ciphertext);
// the key derives from the entered password via PBKDF2, so neither the password
// nor the content is readable from the repo or page source.
(function () {
    const form = document.getElementById('zermatt1-form');
    if (!form) return;

    const container = document.getElementById('zermatt1-container');
    const input = document.getElementById('zermatt1-password');
    const error = document.getElementById('zermatt1-error');

    let blobPromise = null;
    function fetchBlob() {
        if (!blobPromise) {
            blobPromise = fetch('zermatt1.enc').then((r) => {
                if (!r.ok) throw new Error('fetch failed');
                return r.text();
            });
        }
        return blobPromise;
    }

    async function decrypt(b64, password) {
        const data = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertext = data.slice(28);
        const material = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 300000, hash: 'SHA-256' },
            material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
        return new TextDecoder().decode(plaintext);
    }

    async function unlock(password) {
        const html = await decrypt(await fetchBlob(), password);
        container.innerHTML = html;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        error.hidden = true;
        try {
            await unlock(input.value);
        } catch (err) {
            error.hidden = false;
            input.select();
        }
    });

    // Cleanup for visitors who unlocked while the old auto-unlock shipped.
    sessionStorage.removeItem('zermatt1');
})();
