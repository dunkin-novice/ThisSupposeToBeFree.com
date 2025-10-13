// --- DOM Element References ---
const uploadBox = document.getElementById('upload-box');
const imageInput = document.getElementById('image-input');
const controls = document.getElementById('controls');
const convertAllBtn = document.getElementById('convert-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const previewGrid = document.getElementById('preview-grid');
const statusMessage = document.getElementById('status-message');
const dragOverlay = document.getElementById('drag-overlay');
const formatSelect = document.getElementById('format-select');
const qualityControlGroup = document.getElementById('quality-control-group');
const qualitySelect = document.getElementById('quality-select');
const pngNote = document.getElementById('png-note'); // New note element

// --- State Management ---
let isConverting = false;
let dragCounter = 0;
let filesToProcess = [];

// --- Event Listeners ---
uploadBox.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    imageInput.value = ''; // Reset input to allow re-uploading the same file
});

// Drag and Drop Listeners
window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (isConverting) return;
    if (e.dataTransfer.types.includes('Files')) {
        dragCounter++;
        if (dragCounter === 1) dragOverlay.classList.remove('hidden');
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) dragOverlay.classList.add('hidden');
});

window.addEventListener('dragover', (e) => e.preventDefault());

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('hidden');
    dragCounter = 0;
    if (isConverting) return;
    handleFiles(e.dataTransfer.files);
});

// Control Button Listeners
convertAllBtn.addEventListener('click', handleConvertAll);
clearAllBtn.addEventListener('click', handleClearAll);
formatSelect.addEventListener('change', updateUI);
qualitySelect.addEventListener('change', updateUI);


// --- Core Functions ---

function handleFiles(files) {
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            createImagePreview(file);
        }
    }
    updateUI();
}

function createImagePreview(file) {
    const fileId = `file-${Math.random().toString(36).substr(2, 9)}`;
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.id = fileId;
    card.dataset.status = 'pending'; // statuses: pending, converting, success, error

    card.innerHTML = `
        <button class="remove-btn">&times;</button>
        <img src="${URL.createObjectURL(file)}" alt="Preview of ${file.name}">
        <div class="file-info">
            <p class="filename" title="${file.name}">${file.name}</p>
            <p class="filesize">${formatBytes(file.size)}</p>
        </div>
        <div class="card-footer">
            <button class="button single-convert-btn">Convert</button>
        </div>
    `;

    previewGrid.appendChild(card);
    
    // Attach event listeners to the new card's buttons
    card.querySelector('.remove-btn').addEventListener('click', () => {
        if (isConverting) return;
        card.remove();
        filesToProcess = filesToProcess.filter(f => f.id !== fileId);
        updateUI();
    });

    card.querySelector('.single-convert-btn').addEventListener('click', () => {
        if (card.dataset.status !== 'pending') return;
        convertSingleImage(card);
    });
    
    // Store file data for later processing
    filesToProcess.push({ id: fileId, file: file });
}

async function convertSingleImage(card) {
    const fileData = filesToProcess.find(f => f.id === card.id);
    if (!fileData || isConverting) return;

    isConverting = true; // Prevent other actions during single conversion
    card.dataset.status = 'converting';
    updateCardUI(card);
    updateUI();

    try {
        const result = await convertFile(fileData.file);
        if (result) {
            fileData.converted = result;
            card.dataset.status = 'success';
        } else {
            card.dataset.status = 'error';
        }
    } catch (error) {
        console.error('Conversion failed for', fileData.file.name, error);
        card.dataset.status = 'error';
    }
    
    isConverting = false; // Release lock
    updateCardUI(card);
    updateUI();
}


async function handleConvertAll() {
    const pendingCards = Array.from(previewGrid.querySelectorAll('.preview-card[data-status="pending"]'));
    if (pendingCards.length === 0 || isConverting) return;

    isConverting = true;
    updateUI(); // Disable buttons

    const total = pendingCards.length;
    let processed = 0;

    for (const card of pendingCards) {
        card.dataset.status = 'converting';
        updateCardUI(card);
    }
    
    const conversionPromises = pendingCards.map(async (card) => {
        const fileData = filesToProcess.find(f => f.id === card.id);
        if (!fileData) return;

        try {
            const result = await convertFile(fileData.file);
            if (result) {
                fileData.converted = result;
                card.dataset.status = 'success';
            } else {
                card.dataset.status = 'error';
            }
        } catch (error) {
            console.error('Conversion failed for', fileData.file.name, error);
            card.dataset.status = 'error';
        } finally {
            processed++;
            statusMessage.textContent = `Processing... (${processed}/${total})`;
            updateCardUI(card);
        }
    });

    await Promise.all(conversionPromises);

    isConverting = false;
    updateUI(); // Re-enable buttons and update state
    checkAndEnableDownloadAll();
}

function checkAndEnableDownloadAll() {
    const successfulConversions = filesToProcess.filter(f => f.converted);
    const pendingConversions = filesToProcess.filter(f => f.dataset.status === 'pending' || f.dataset.status === 'converting' ).length;
    
    const allCards = previewGrid.querySelectorAll('.preview-card');
    const pendingCards = Array.from(allCards).filter(card => card.dataset.status === 'pending');

    if (successfulConversions.length > 0 && pendingCards.length === 0) {
        convertAllBtn.textContent = `Download All (${successfulConversions.length}) as ZIP`;
        convertAllBtn.onclick = handleDownloadAll;
        convertAllBtn.classList.add('download-all');
    }
}


async function handleDownloadAll() {
    const filesToZip = filesToProcess.filter(f => f.converted);
    if (filesToZip.length === 0 || isConverting) return;

    isConverting = true;
    statusMessage.textContent = 'Zipping files...';
    updateUI();
    
    const zip = new JSZip();
    filesToZip.forEach(fileData => {
        zip.file(fileData.converted.name, fileData.converted.blob);
    });

    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `ThisSupposeToBeFree_Images.zip`);
    } catch (error) {
        console.error('Error creating ZIP file:', error);
        statusMessage.textContent = 'Error creating ZIP file.';
    } finally {
        isConverting = false;
        updateUI();
    }
}


function convertFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                const format = formatSelect.value;
                const mimeType = `image/${format}`;
                
                if (format === 'jpg') {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);
                
                let quality = parseFloat(qualitySelect.value);
                if (format === 'png') quality = undefined;

                canvas.toBlob(blob => {
                    if (blob) {
                        const newFileName = `${file.name.split('.').slice(0, -1).join('.')}.${format}`;
                        resolve({ name: newFileName, blob: blob, size: blob.size });
                    } else {
                        reject(new Error('Canvas toBlob returned null'));
                    }
                }, mimeType, quality);
            };
            img.onerror = () => reject(new Error('Image failed to load'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('File could not be read'));
        reader.readAsDataURL(file);
    });
}


function handleClearAll() {
    if (isConverting) return;
    previewGrid.innerHTML = '';
    filesToProcess = [];
    updateUI();
}


// --- UI Update Functions ---

function updateUI() {
    const hasFiles = filesToProcess.length > 0;
    controls.classList.toggle('hidden', !hasFiles);
    
    const format = formatSelect.value.toUpperCase();
    convertAllBtn.textContent = `Convert All to ${format}`;
    convertAllBtn.classList.remove('download-all');
    convertAllBtn.onclick = handleConvertAll;
    
    convertAllBtn.disabled = isConverting;
    clearAllBtn.disabled = isConverting;
    formatSelect.disabled = isConverting;
    qualitySelect.disabled = isConverting;
    
    qualityControlGroup.classList.toggle('disabled', formatSelect.value === 'png' || isConverting);
    // New: Show/hide the PNG note
    pngNote.classList.toggle('hidden', formatSelect.value !== 'png' || isConverting);


    if (isConverting) {
        // The conversion functions handle the message
    } else if (hasFiles) {
        const convertedCount = filesToProcess.filter(f => f.converted).length;
        if (convertedCount > 0) {
            statusMessage.textContent = `${convertedCount} file(s) converted.`;
        } else {
            statusMessage.textContent = '';
        }
    } else {
        statusMessage.textContent = '';
    }
    
    checkAndEnableDownloadAll();
}


function updateCardUI(card) {
    const footer = card.querySelector('.card-footer');
    const status = card.dataset.status;
    const fileData = filesToProcess.find(f => f.id === card.id);
    
    let footerHTML = '';

    switch (status) {
        case 'pending':
            footerHTML = `<button class="button single-convert-btn">Convert</button>`;
            break;
        case 'converting':
            footerHTML = `<p class="card-status">Converting...</p>`;
            break;
        case 'success':
            footerHTML = `<a href="${URL.createObjectURL(fileData.converted.blob)}" download="${fileData.converted.name}" class="button single-download-link">Download (${formatBytes(fileData.converted.size)})</a>`;
            break;
        case 'error':
            footerHTML = `<p class="card-status error">Failed!</p>`;
            break;
    }
    footer.innerHTML = footerHTML;

    if (status === 'pending') {
        footer.querySelector('.single-convert-btn').addEventListener('click', () => {
            if (card.dataset.status !== 'pending') return;
            convertSingleImage(card);
        });
    }
}


// --- Helper Functions ---

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

