// js/modules/scanner.js
function createScannerModule() {
    // 1. Internal state & DOM refs
    let html5QrCode;
    let scannerModal, scannerCloseBtn;
    let currentTargetInput = null;

    // 2. Private functions
    function onScanSuccess(decodedText) {
        // When a scan is successful, stop the scanner...
        stop();
        // ...and if we have a target input, put the text in it and trigger an input event.
        if (currentTargetInput) {
            currentTargetInput.value = decodedText;
            currentTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function stop() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Scanner failed to stop.", err));
        }
        if (scannerModal) scannerModal.style.display = 'none';
        currentTargetInput = null; // Clear the target
    }

    // 3. Public function
    function start(targetInputElement) {
        if (!html5QrCode || !scannerModal) {
            console.error("Scanner module not initialized properly.");
            return;
        }
        
        // Store the input element we need to populate on success
        currentTargetInput = targetInputElement;
        
        scannerModal.style.display = 'flex';
        html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 150 } }, 
            onScanSuccess, 
            () => {} // Optional error callback
        ).catch(err => {
            alert("Could not start camera. Please grant camera permissions to this site.");
            stop();
        });
    }

    // 4. Init function
    function init() {
        // Get DOM elements once
        scannerModal = document.getElementById('scanner-modal');
        scannerCloseBtn = document.getElementById('scanner-close-btn');

        if (!scannerModal || !scannerCloseBtn) {
            console.warn("Scanner modal DOM elements not found. Scanner will be disabled.");
            return;
        }

        if (typeof Html5Qrcode !== 'undefined') {
            html5QrCode = new Html5Qrcode("barcode-reader");
            scannerCloseBtn.addEventListener('click', stop);
        } else {
            console.warn("Html5Qrcode library not found. Scanner will be disabled.");
        }
    }

    // 5. Expose public API
    return {
        init,
        start
    };
}