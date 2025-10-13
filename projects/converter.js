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

let uploadedFiles = [];
let isBatchConverting = false;
let dragCounter = 0;

// --- Event Listeners ---
uploadBox.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
    e.target.value = null; // Reset input to allow re-uploading the same file
});

// Drag and Drop Listeners for the entire window
window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (isBatchConverting) return;
    if (Array.from(e.dataTransfer.types).includes('Files')) {
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
    if (isBatchConverting) return;
    handleFileUpload(e.dataTransfer.files);
});

// Control Listeners
convertAllBtn.addEventListener('click', handleBatchConvert);
clearAllBtn.addEventListener('click', handleClearAll);
formatSelect.addEventListener('change', updateUI);
qualitySelect.addEventListener('change', updateUI);


// --- Core Functions ---

function handleFileUpload(files) {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    imageFiles.forEach(file => {
        const fileId = `${file.name}-${file.lastModified}`;
        const newFile = { id: fileId, file: file, status: 'pending' };
        uploadedFiles.push(newFile);
        createPreviewCard(newFile);
    });
    updateUI();
}

function createPreviewCard(fileData) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.dataset.fileId = fileData.id;

    const reader = new FileReader();
    reader.onload = (e) => {
        card.innerHTML = `
            <button class="remove-btn">&times;</button>
            <img src="${e.target.result}" alt="Preview of ${fileData.file.name}">
            <div class="file-info">
                <p class="filename" title="${fileData.file.name}">${fileData.file.name}</p>
                <p class="filesize">${(fileData.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <div class="card-footer">
                <button class="button single-convert-btn">Convert</button>
            </div>
        `;
        previewGrid.appendChild(card);
        // Add event listeners after the card is in the DOM
        card.querySelector('.remove-btn').addEventListener('click', () => handleRemoveFile(fileData.id));
        card.querySelector('.single-convert-btn').addEventListener('click', () => handleSingleConvert(fileData.id));
    };
    reader.readAsDataURL(fileData.file);
}

async function handleSingleConvert(fileId) {
    const card = document.querySelector(`.preview-card[data-file-id="${fileId}"]`);
    const fileData = uploadedFiles.find(f => f.id === fileId);
    if (!card || !fileData) return;

    const footerEl = card.querySelector('.card-footer');
    footerEl.innerHTML = `<p class="card-status">Processing...</p>`;
    statusMessage.textContent = 'Processing... this may take a moment.';

    try {
        const result = await convertImage(fileData.file);
        if (result) {
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(result.blob);
            downloadLink.download = result.filename;
            downloadLink.className = 'button single-download-link';
            downloadLink.textContent = `Download ${result.format.toUpperCase()}`;
            
            footerEl.innerHTML = ''; // Clear the footer
            footerEl.appendChild(downloadLink);
            fileData.status = 'converted';
        } else {
            throw new Error('Conversion returned no result.');
        }
    } catch (error) {
        footerEl.innerHTML = `<p class="card-status error">Failed!</p>`;
        fileData.status = 'failed';
        console.error('Single conversion failed:', error);
    } finally {
         statusMessage.textContent = ''; // Clear global message after any single attempt
         updateUI();
    }
}

async function handleBatchConvert() {
    isBatchConverting = true;
    updateUI();

    const filesToConvert = uploadedFiles.filter(f => f.status === 'pending');
    for (const fileData of filesToConvert) {
        await handleSingleConvert(fileData.id);
    }

    isBatchConverting = false;
    updateUI();
}

function handleDownloadAll() {
    const convertedFiles = uploadedFiles.filter(f => f.status === 'converted');
    if (convertedFiles.length === 0) return;

    const zip = new JSZip();
    const downloadLinks = document.querySelectorAll('.single-download-link');

    downloadLinks.forEach(link => {
        // This is a simplified approach; a robust solution would fetch blobs
        const filename = link.download;
        const url = link.href;
        zip.file(filename, fetch(url).then(res => res.blob()));
    });
    
    zip.generateAsync({type:"blob"}).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `ThisSupposeToBeFree.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}


function convertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                
                const ctx = canvas.getContext('2d');
                const targetFormat = formatSelect.value;
                const mimeType = `image/${targetFormat}`;

                if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                ctx.drawImage(img, 0, 0);

                const qualityValue = parseFloat(qualitySelect.value);
                const newFileName = file.name.split('.').slice(0, -1).join('.') + `.${targetFormat}`;

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve({
                                blob: blob,
                                filename: newFileName,
                                format: targetFormat,
                                originalSize: file.size,
                                newSize: blob.size,
                            });
                        } else {
                            reject(new Error('Canvas toBlob returned null.'));
                        }
                    },
                    mimeType,
                    qualityValue
                );
            };

            img.onerror = () => reject(new Error(`Could not load image: ${file.name}.`));
            img.src = event.target.result; 
        };

        reader.onerror = () => reject(new Error(`Could not read file: ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function handleRemoveFile(fileId) {
    if (isBatchConverting) return;
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    const card = document.querySelector(`.preview-card[data-file-id="${fileId}"]`);
    if (card) card.remove();
    updateUI();
}

function handleClearAll() {
    if (isBatchConverting) return;
    uploadedFiles = [];
    previewGrid.innerHTML = '';
    updateUI();
}

function updateUI() {
    const hasFiles = uploadedFiles.length > 0;
    controls.classList.toggle('hidden', !hasFiles);

    // Toggle quality dropdown based on selected format
    const isPng = formatSelect.value === 'png';
    qualityControlGroup.classList.toggle('disabled', isPng);
    qualitySelect.disabled = isPng;
    
    const filesToConvert = uploadedFiles.filter(f => f.status === 'pending').length;
    const filesConverted = uploadedFiles.filter(f => f.status === 'converted').length;

    if (isBatchConverting) {
        convertAllBtn.disabled = true;
        convertAllBtn.textContent = `Converting...`;
        clearAllBtn.style.display = 'none';
    } else if (hasFiles && filesToConvert > 0) {
        // State: Ready to convert
        convertAllBtn.disabled = false;
        const format = formatSelect.value.toUpperCase();
        convertAllBtn.textContent = `Convert All to ${format}`;
        convertAllBtn.onclick = handleBatchConvert;
        clearAllBtn.style.display = 'inline-block';
    } else if (hasFiles && filesToConvert === 0 && filesConverted > 0) {
        // State: All converted, ready to download
        convertAllBtn.disabled = false;
        convertAllBtn.textContent = 'Download All (.zip)';
        convertAllBtn.onclick = handleDownloadAll;
        clearAllBtn.style.display = 'inline-block';
    } else {
         clearAllBtn.style.display = 'inline-block';
    }

    // Update individual convert button texts
    const format = formatSelect.value.toUpperCase();
    document.querySelectorAll('.single-convert-btn').forEach(btn => {
        btn.textContent = `Convert to ${format}`;
    });
}

