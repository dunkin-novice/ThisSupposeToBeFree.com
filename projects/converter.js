// Get references to our HTML elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const imagePreviews = document.getElementById('image-previews');
const resultsArea = document.getElementById('results-area');
const controls = document.getElementById('controls');
const convertAllBtn = document.getElementById('convert-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const dragOverlay = document.getElementById('drag-overlay');
const formatSelect = document.getElementById('format-select');
const adContainer = document.getElementById('ad-container');
const qualityControl = document.getElementById('quality-control');
const qualitySelect = document.getElementById('quality-select');
const mainHeading = document.getElementById('main-heading'); // New reference

let isConverting = false;
let dragCounter = 0;

// --- INITIALIZATION ---
window.addEventListener('load', readURLHash);
window.addEventListener('hashchange', readURLHash);

// --- EVENT LISTENERS ---
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files);
    event.target.value = null;
});
// ... (drag/drop listeners remain the same) ...
window.addEventListener('dragenter', (e) => { e.preventDefault(); if (isConverting) return; if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) { dragCounter++; if (dragCounter === 1) dragOverlay.classList.add('active'); } });
window.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) dragOverlay.classList.remove('active'); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (event) => { event.preventDefault(); dragOverlay.classList.remove('active'); dragCounter = 0; if (isConverting) return; handleFiles(event.dataTransfer.files); });

convertAllBtn.addEventListener('click', handleConvertAll);
clearAllBtn.addEventListener('click', handleClearAll);

formatSelect.addEventListener('change', () => {
    toggleQualityControl();
    updateURLAndContent();
});

// --- NEW ROUTING AND DYNAMIC CONTENT FUNCTIONS ---
function updateURLAndContent() {
    // For simplicity, we'll create a generic slug for now.
    // A future improvement could be to detect the input format.
    const toFormat = formatSelect.value;
    const slug = `image-to-${toFormat}`;

    // Update the URL hash without reloading the page
    history.pushState(null, '', `/#/${slug}`);

    // Update the content on the page
    updatePageContent(toFormat);
}

function readURLHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#/image-to-')) {
        const format = hash.split('-to-')[1];
        if (['webp', 'png', 'jpeg'].includes(format)) {
            formatSelect.value = format;
            updatePageContent(format);
            toggleQualityControl();
        }
    } else {
        // Default state if no valid hash
        updatePageContent('webp');
    }
}

function updatePageContent(toFormat) {
    const formatName = toFormat.toUpperCase();
    const newTitle = `Free Image to ${formatName} Converter | ThisSupposeToBeFree.com`;
    const newHeading = `Image to ${formatName} Converter`;

    // Update the page title (important for SEO)
    document.title = newTitle;
    // Update the main H1 heading
    mainHeading.textContent = newHeading;
    // Update buttons
    updateButtonText();
}

// --- CORE LOGIC (mostly unchanged) ---
function handleFiles(files) { /* ... no change ... */ if (files.length === 0) return; for (const file of files) { createImagePreview(file); } }
function createImagePreview(file) { /* ... no change ... */ const reader = new FileReader(); reader.onload = (event) => { const previewWrapper = document.createElement('div'); previewWrapper.className = 'preview-wrapper'; previewWrapper.fileData = file; const img = document.createElement('img'); img.src = event.target.result; img.className = 'preview-image'; const info = document.createElement('div'); info.className = 'preview-info'; info.innerHTML = `<span class="file-name">${file.name}</span><span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>`; const convertBtn = document.createElement('button'); convertBtn.className = 'convert-btn'; const selectedFormat = formatSelect.value.toUpperCase(); convertBtn.textContent = `Convert to ${selectedFormat}`; convertBtn.onclick = () => convertImage(previewWrapper); const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.innerHTML = '&times;'; removeBtn.onclick = (e) => { if (isConverting) return; e.stopPropagation(); previewWrapper.remove(); updateControlsState(); }; previewWrapper.appendChild(removeBtn); previewWrapper.appendChild(img); previewWrapper.appendChild(info); previewWrapper.appendChild(convertBtn); imagePreviews.appendChild(previewWrapper); updateControlsState(); }; reader.readAsDataURL(file); }
function convertImage(previewWrapper, onCompleteCallback) { /* ... no change ... */ const file = previewWrapper.fileData; const convertBtn = previewWrapper.querySelector('.convert-btn'); if (!convertBtn) { if (onCompleteCallback) onCompleteCallback(); return; } convertBtn.textContent = 'Converting...'; convertBtn.disabled = true; const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); const targetFormat = formatSelect.value; if (targetFormat === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.drawImage(img, 0, 0); const mimeType = `image/${targetFormat}`; const quality = parseFloat(qualitySelect.value); const dataUrl = canvas.toDataURL(mimeType, quality); const newFileName = file.name.split('.').slice(0, -1).join('.') + `.${targetFormat}`; const downloadLink = document.createElement('a'); downloadLink.href = dataUrl; downloadLink.download = newFileName; downloadLink.textContent = `Download ${targetFormat.toUpperCase()}`; downloadLink.className = 'download-link'; downloadLink.onclick = () => { downloadLink.textContent = 'Done ✅'; downloadLink.classList.add('downloaded'); }; convertBtn.replaceWith(downloadLink); if (onCompleteCallback) onCompleteCallback(); }; img.src = URL.createObjectURL(file); }
function handleConvertAll() { /* ... no change ... */ if (isConverting) return; const wrappersToConvert = Array.from(document.querySelectorAll('.preview-wrapper')).filter(w => w.querySelector('.convert-btn')); const totalToConvert = wrappersToConvert.length; if (totalToConvert === 0) return; isConverting = true; let conversionProgress = 0; convertAllBtn.textContent = `Converting... (0/${totalToConvert})`; convertAllBtn.disabled = true; clearAllBtn.style.display = 'none'; wrappersToConvert.forEach(wrapper => { convertImage(wrapper, () => { conversionProgress++; convertAllBtn.textContent = `Converting... (${conversionProgress}/${totalToConvert})`; if (conversionProgress === totalToConvert) { isConverting = false; clearAllBtn.style.display = 'inline-block'; updateToDownloadAllState(); } }); }); }
async function handleDownloadAll() { /* ... no change ... */ if (isConverting) return; isConverting = true; convertAllBtn.textContent = 'Zipping...'; convertAllBtn.disabled = true; clearAllBtn.style.display = 'none'; const zip = new JSZip(); const downloadLinks = document.querySelectorAll('.download-link:not(.downloaded)'); for (const link of downloadLinks) { const response = await fetch(link.href); const blob = await response.blob(); zip.file(link.download, blob); link.textContent = 'Done ✅'; link.classList.add('downloaded'); } if (Object.keys(zip.files).length > 0) { await zip.generateAsync({ type: 'blob' }).then(content => { const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = `ConvertUnlimited_${formatSelect.value}.zip`; document.body.appendChild(link); link.click(); document.body.removeChild(link); }); } isConverting = false; clearAllBtn.style.display = 'inline-block'; updateControlsState(); }
function handleClearAll() { /* ... no change ... */ if (isConverting) return; imagePreviews.innerHTML = ''; updateControlsState(); }
function updateButtonText() { /* ... no change ... */ const selectedFormat = formatSelect.value.toUpperCase(); document.querySelectorAll('.convert-btn').forEach(btn => { btn.textContent = `Convert to ${selectedFormat}`; }); if (document.querySelectorAll('.convert-btn').length > 0) { resetConvertAllButtonState(); } }
function toggleQualityControl() { /* ... no change ... */ qualityControl.classList.toggle('disabled', formatSelect.value === 'png'); }
function updateControlsState() { /* ... no change ... */ const numPreviews = document.querySelectorAll('.preview-wrapper').length; if (numPreviews > 0) { resultsArea.classList.remove('hidden'); } else { resultsArea.classList.add('hidden'); } const hasUnconverted = document.querySelectorAll('.convert-btn').length > 0; if(hasUnconverted) { resetConvertAllButtonState(); } else if (numPreviews > 0){ updateToDownloadAllState(); } }
function updateToDownloadAllState() { /* ... no change ... */ convertAllBtn.textContent = `Download All (.zip)`; convertAllBtn.disabled = false; convertAllBtn.onclick = handleDownloadAll; }
function resetConvertAllButtonState() { /* ... no change ... */ const selectedFormat = formatSelect.value.toUpperCase(); convertAllBtn.textContent = `Convert All to ${selectedFormat}`; convertAllBtn.disabled = false; convertAllBtn.onclick = handleConvertAll; }
