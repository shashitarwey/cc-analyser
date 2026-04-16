// Print-to-PDF helper that picks the right strategy per platform.
//
// Desktop: hidden iframe + contentWindow.print() — stays on the page.
//
// Mobile: most mobile browsers (iOS Safari, Chrome Android) ignore the
// iframe context and print the parent page instead, which means the user's
// "Save as PDF" captures the app UI, not the report. For those we open a
// new tab with the HTML (via a Blob URL so DOM events fire reliably) and
// trigger print from there. Tab can be closed after saving the PDF.

const isMobile = () => {
    if (typeof window === 'undefined') return false;
    // Coarse pointer + small viewport is a solid signal across iOS / Android
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    const small = window.innerWidth <= 900;
    const ua = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    return ua || (touch && small);
};

const printInNewTab = (html) => {
    // Use a Blob URL so the new tab has a proper document with its own
    // `window.print()` bound to *its* content, not the opener page.
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const w = window.open(url, '_blank');
    if (!w) {
        URL.revokeObjectURL(url);
        return { ok: false, error: 'popup-blocked' };
    }

    // Give the new tab time to render, then trigger print. We can't always
    // access w.print directly if the Blob is treated as cross-origin on
    // some browsers, so we rely on the inline <script> injected into html.
    // Revoke the URL after a delay so the tab can still reference it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { ok: true };
};

const printInIframe = (html) => {
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
        setTimeout(() => {
            const frame = document.getElementById('cv-print-frame');
            if (frame) frame.remove();
        }, 1000);
    };

    const triggerPrint = () => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch { /* ignore */ }
        if (iframe.contentWindow) {
            iframe.contentWindow.onafterprint = cleanup;
        }
        setTimeout(cleanup, 60_000);
    };

    if (doc.readyState === 'complete') {
        setTimeout(triggerPrint, 100);
    } else {
        iframe.onload = () => setTimeout(triggerPrint, 100);
    }

    return { ok: true };
};

// Inject an inline print trigger into the HTML for the new-tab path.
// (Iframe path calls print from the parent, so this script is harmless there.)
const withAutoPrint = (html) => {
    const script = `<script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.focus(); window.print(); }, 300);
        });
    </script>`;
    return html.includes('</body>')
        ? html.replace('</body>', `${script}</body>`)
        : html + script;
};

export const printHtmlInIframe = (html) => {
    try {
        if (isMobile()) {
            return printInNewTab(withAutoPrint(html));
        }
        return printInIframe(html);
    } catch (err) {
        return { ok: false, error: err.message };
    }
};
