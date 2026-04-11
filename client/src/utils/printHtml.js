// Render an HTML document in a hidden iframe and trigger the print dialog
// without navigating away from the current page.
//
// The inline <script> in the HTML must NOT call window.print() — this helper
// calls it on the iframe's contentWindow after the document has loaded.
//
// Returns { ok: true } on success, { ok: false, error } if iframe setup fails.
export const printHtmlInIframe = (html) => {
    try {
        const existing = document.getElementById('cv-print-frame');
        if (existing) existing.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'cv-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) {
            iframe.remove();
            return { ok: false, error: 'iframe-unavailable' };
        }

        doc.open();
        doc.write(html);
        doc.close();

        const cleanup = () => {
            // Give the browser a moment to finish the dialog, then remove
            setTimeout(() => {
                const frame = document.getElementById('cv-print-frame');
                if (frame) frame.remove();
            }, 1000);
        };

        const triggerPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch {
                // Silently ignore — the user can close the dialog
            }
            // Clean up after the print dialog closes (onafterprint fires reliably in modern browsers)
            if (iframe.contentWindow) {
                iframe.contentWindow.onafterprint = cleanup;
            }
            // Fallback cleanup in case onafterprint doesn't fire
            setTimeout(cleanup, 60_000);
        };

        // Most browsers fire load on the iframe once document.close() finishes,
        // but we also guard with a short timeout for Safari quirks.
        if (doc.readyState === 'complete') {
            setTimeout(triggerPrint, 100);
        } else {
            iframe.onload = () => setTimeout(triggerPrint, 100);
        }

        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};
