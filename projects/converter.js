// Get references to our HTML elements
const imageInput = document.getElementById('image-input');
const dragOverlay = document.getElementById('drag-overlay');
const uploadBox = document.getElementById('upload-box');
const controls = document.getElementById('controls');
const formatSelect = document.getElementById('format-select');
const qualitySelect = document.getElementById('quality-select');
const qualityControlGroup = document.getElementById('quality-control-group');
const convertAllBtn = document.getElementById('convert-all-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const previewGrid = document.getElementById('preview-grid');
const resultsArea = document.getElementById('results-area');
const resultsList = document.getElementById('results-list');
const downloadAllBtn = document.getElementById('download-all-btn');
const statusMessage = document.getElementById('status-message');

let filesToProcess = [];
let dragCounter = 0;

// --- Drag and Drop Logic ---
window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter++;
        dragOverlay.classList.remove('hidden');
    }
});
dragOverlay.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        dragOverlay.classList.add('hidden');
    }
});
dragOverlay.addEventListener('dragover', (e) => e.preventDefault());
dragOverlay.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.classList.add('hidden');
    handleFiles(e.dataTransfer.files);
});

// --- Event Listeners ---
uploadBox.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', () => handleFiles(imageInput.files));
clearAllBtn.addEventListener('click', handleClearAll);
convertAllBtn.addEventListener('click', handleConvertAll);
formatSelect.addEventListener('change', updateControlOptions);

// --- Core Functions ---
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        createImagePreview(file);
    });
}

function createImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileId = `file-${Date.now()}-${Math.random()}`;
        const fileObject = { id: fileId, file: file, converted: false };
        filesToProcess.push(fileObject);

        const previewCard = document.createElement('div');
        previewCard.className = 'preview-card';
        previewCard.id = fileId;
        previewCard.innerHTML = `
            <button class="remove-btn">&times;</button>
            <img src="${e.target.result}" alt="${file.name}">
            <div class="file-info">
                <p class="filename" title="${file.name}">${file.name}</p>
                <p class="filesize">${formatBytes(file.size)}</p>
            </div>
            <div class="card-footer">
                 <button class="button single-convert-btn">Convert</button>
            </div>
        `;
        previewGrid.appendChild(previewCard);

        previewCard.querySelector('.remove-btn').addEventListener('click', () => {
            filesToProcess = filesToProcess.filter(f => f.id !== fileId);
            previewCard.remove();
            updateUIState();
        });

        previewCard.querySelector('.single-convert-btn').addEventListener('click', (event) => {
            handleSingleConvert(fileObject, event.currentTarget);
        });
        
        updateUIState();
    };
    reader.readAsDataURL(file);
}

function updateUIState() {
    const hasFiles = filesToProcess.length > 0;
    const hasUnconvertedFiles = filesToProcess.some(f => !f.converted);

    controls.classList.toggle('hidden', !hasFiles);
    convertAllBtn.classList.toggle('hidden', !hasUnconvertedFiles);

    resultsArea.classList.add('hidden');
    uploadBox.style.borderStyle = hasFiles ? 'solid' : 'dashed';

    if (!hasFiles) {
        statusMessage.textContent = '';
        resultsList.innerHTML = '';
    }
}

function handleClearAll() {
    filesToProcess = [];
    previewGrid.innerHTML = '';
    updateUIState();
}

function updateControlOptions() {
    const isPNG = formatSelect.value === 'png';
    qualitySelect.disabled = isPNG;
    qualityControlGroup.classList.toggle('disabled', isPNG);
    
    const format = formatSelect.options[formatSelect.selectedIndex].text;
    convertAllBtn.textContent = `Convert All to ${format}`;
}

async function handleSingleConvert(fileObject, button) {
    button.disabled = true;
    button.textContent = 'Converting...';

    const targetFormat = formatSelect.value;
    const quality = parseFloat(qualitySelect.value);
    const result = await convertImage(fileObject.file, targetFormat, quality);

    if (result) {
        const baseName = result.originalName.substring(0, result.originalName.lastIndexOf('.') || result.originalName.length);
        const newFileName = `${baseName}.${result.newExtension}`;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(result.blob);
        downloadLink.download = newFileName;
        downloadLink.className = 'button single-download-link';
        downloadLink.textContent = `Download (${formatBytes(result.newSize)})`;
        
        button.replaceWith(downloadLink);

        // Mark as converted
        fileObject.converted = true;
        updateUIState(); // This will hide the "Convert All" if it's the last one
    } else {
        button.textContent = '❌ Failed';
        button.style.backgroundColor = 'var(--danger-color)';
    }
}


async function handleConvertAll() {
    const filesToConvert = filesToProcess.filter(f => !f.converted);
    if (filesToConvert.length === 0) return;

    const targetFormat = formatSelect.value;
    const quality = parseFloat(qualitySelect.value);

    convertAllBtn.disabled = true;
    statusMessage.textContent = 'Processing... this may take a moment.';
    resultsList.innerHTML = '';
    downloadAllBtn.classList.add('hidden');
    
    let convertedFiles = [];

    for (const fileObj of filesToConvert) {
        const card = document.getElementById(fileObj.id);
        const footer = card.querySelector('.card-footer');
        footer.innerHTML = `<p class="card-status">Converting...</p>`;

        const result = await convertImage(fileObj.file, targetFormat, quality);

        if (result) {
            convertedFiles.push(result);
            footer.innerHTML = `<p class="card-status success">✅ Converted (${formatBytes(result.newSize)})</p>`;
            fileObj.converted = true;
        } else {
            footer.innerHTML = `<p class="card-status error">❌ Failed</p>`;
        }
    }
    
    displayResults(convertedFiles);
    statusMessage.textContent = `✅ Conversion Complete!`;
    convertAllBtn.disabled = false;
    updateUIState();
}

function convertImage(file, format, quality) {
   const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
   return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if ((file.type !== 'image/jpeg') && format === 'jpg') {
                 ctx.fillStyle = 'white';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve({
                        originalName: file.name,
                        originalSize: file.size,
                        blob: blob,
                        newSize: blob.size,
                        newExtension: format
                    });
                } else { resolve(null); }
            }, mimeType, quality);
        };
        img.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

function displayResults(converted) {
     if (converted.length === 0) {
        statusMessage.textContent = 'Could not convert any of the selected files.';
        return;
    }

    resultsArea.classList.remove('hidden');
    resultsList.innerHTML = '';

    converted.forEach((fileData) => {
        const reduction = 100 - (fileData.newSize / fileData.originalSize) * 100;
        const baseName = fileData.originalName.substring(0, fileData.originalName.lastIndexOf('.') || fileData.originalName.length);
        const newFileName = `${baseName}.${fileData.newExtension}`;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
             <div class="result-info">
                <div class="filename" title="${newFileName}">${newFileName}</div>
                <div class="size-details">
                    Original: ${formatBytes(fileData.originalSize)} &rarr; New: ${formatBytes(fileData.newSize)}
                    <span class="reduction">(${reduction.toFixed(1)}% smaller)</span>
                </div>
            </div>
            <button class="button download-btn">Download</button>
        `;
        resultsList.appendChild(resultItem);
        
        resultItem.querySelector('.download-btn').addEventListener('click', () => {
            downloadBlob(fileData.blob, newFileName);
        });
    });

    if (converted.length > 1) {
        downloadAllBtn.classList.remove('hidden');
        downloadAllBtn.onclick = async () => {
            const btnOriginalText = downloadAllBtn.textContent;
            downloadAllBtn.textContent = "Zipping...";
            downloadAllBtn.disabled = true;

            const zip = new JSZip();
            converted.forEach(fileData => {
                const baseName = fileData.originalName.substring(0, fileData.originalName.lastIndexOf('.') || fileData.originalName.length);
                const newFileName = `${baseName}.${fileData.newExtension}`;
                zip.file(newFileName, fileData.blob);
            });
            const zipBlob = await zip.generateAsync({type:"blob"});
            downloadBlob(zipBlob, "ThisSupposeToBeFree_Images.zip");
            
            downloadAllBtn.textContent = btnOriginalText;
            downloadAllBtn.disabled = false;
        };
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

// Initial state setup
updateControlOptions();

