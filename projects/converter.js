// Wrap all logic to ensure it only runs on the converter page
if (document.getElementById('upload-area')) {
    
    // --- DOM Element References ---
    const uploadArea = document.getElementById('upload-area');
    const dragOverlay = document.getElementById('drag-overlay');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const controlsArea = document.getElementById('controls-area');
    const formatSelect = document.getElementById('format-select');
    
    // --- State Management ---
    let filesToProcess = [];
    let dragCounter = 0;
    let isBatchConverting = false;
    
    // --- GLOBAL DRAG AND DROP HANDLERS (Attached to the window) ---
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        dragOverlay.classList.add('visible');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            dragOverlay.classList.remove('visible');
        }
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop globally
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dragOverlay.classList.remove('visible');
        handleFiles(e.dataTransfer.files);
    });

    // --- File Input Handler ---
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    // --- Core File Handling Logic ---
    function handleFiles(newFiles) {
        if (isBatchConverting) return;
        
        [...newFiles].forEach(file => {
            if (!filesToProcess.some(f => f.file.name === file.name && f.file.size === file.size)) {
                const fileObject = {
                    id: `file-${Date.now()}-${Math.random()}`,
                    file: file,
                    status: 'pending',
                    convertedData: null,
                };
                filesToProcess.push(fileObject);
            }
        });
        renderFileList();
        updateControlsVisibility();
    }

    // --- UI Rendering ---
    function renderFileList() {
        fileList.innerHTML = '';
        filesToProcess.forEach((item) => {
            const li = document.createElement('li');
            li.dataset.id = item.id;
            const originalSize = (item.file.size / 1024).toFixed(1);
            let actionButtonHtml = '';

            switch(item.status) {
                case 'converting':
                    actionButtonHtml = `<button class="btn btn-secondary" disabled>Converting...</button>`;
                    break;
                case 'done':
                    const newSize = (item.convertedData.size / 1024).toFixed(1);
                    actionButtonHtml = `<button class="btn btn-success download-file" data-id="${item.id}">Download (${newSize} KB)</button>`;
                    break;
                case 'error':
                     actionButtonHtml = `<button class="btn btn-error" disabled>Error</button>`;
                     break;
                default:
                    actionButtonHtml = `<button class="btn btn-primary convert-single" data-id="${item.id}">Convert</button>`;
            }

            li.innerHTML = `
                <div class="file-info">
                    <span>${item.file.name} (${originalSize} KB)</span>
                </div>
                <div class="file-actions">
                    ${actionButtonHtml}
                    <button class="remove-file" data-id="${item.id}">&times;</button>
                </div>
            `;
            fileList.appendChild(li);
        });
    }

    function updateControlsVisibility() {
        controlsArea.style.display = filesToProcess.length > 0 ? 'block' : 'none';
    }
    
    // --- Event Delegation for File Actions ---
    fileList.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (target.classList.contains('remove-file')) {
            filesToProcess = filesToProcess.filter(item => item.id !== id);
            renderFileList();
            updateControlsVisibility();
        } else if (target.classList.contains('convert-single')) {
            convertSingleFile(id);
        } else if (target.classList.contains('download-file')) {
            downloadSingleFile(id);
        }
    });

    // --- Conversion & Download Logic ---
    function convertSingleFile(id) {
        // ... (Your existing conversion logic)
    }
    
    function downloadSingleFile(id) {
        // ... (Your existing download logic)
    }
    
    clearBtn.addEventListener('click', () => {
        if (isBatchConverting) return;
        filesToProcess = [];
        renderFileList();
        updateControlsVisibility();
    });

    // --- START: DYNAMIC SLUG (URL HASH) LOGIC ---
    function updateHashFromSelection() {
        const selectedFormat = formatSelect.value;
        window.location.hash = `image-to-${selectedFormat}`;
    }

    function updateSelectionFromHash() {
        const hash = window.location.hash;
        if (hash) {
            const format = hash.replace('#image-to-', '');
            if (formatSelect.querySelector(`option[value="${format}"]`)) {
                formatSelect.value = format;
            }
        }
    }

    // Event listener to change the hash when the user selects a new format
    formatSelect.addEventListener('change', updateHashFromSelection);

    // Check the hash when the page loads to set the initial state
    document.addEventListener('DOMContentLoaded', updateSelectionFromHash);
    // --- END: DYNAMIC SLUG (URL HASH) LOGIC ---

} // End of converter page logic wrapper
