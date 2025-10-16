// Wrap all logic to ensure it only runs on the converter page
if (document.getElementById('upload-area')) {
    
    // --- DOM Element References ---
    const fileList = document.getElementById('file-list');
    const controlsArea = document.getElementById('controls-area');
    const formatSelect = document.getElementById('format-select');
    const qualitySelect = document.getElementById('quality-select');
    const qualityControl = document.getElementById('quality-control');
    const convertAllBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const fileInput = document.getElementById('file-input');
    const dragOverlay = document.getElementById('drag-overlay');
    
    // --- State Management ---
    let filesToProcess = [];
    let dragCounter = 0;
    
    // --- GLOBAL DRAG AND DROP HANDLERS ---
    window.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); dragCounter++; dragOverlay.classList.add('visible'); });
    window.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dragCounter--; if (dragCounter === 0) dragOverlay.classList.remove('visible'); });
    window.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    window.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); dragCounter = 0; dragOverlay.classList.remove('visible'); handleFiles(e.dataTransfer.files); });

    // --- Core File Handling ---
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    function handleFiles(newFiles) {
        [...newFiles].forEach(file => {
            if (!filesToProcess.some(f => f.file.name === file.name && f.file.size === file.size)) {
                filesToProcess.push({ id: `file-${Date.now()}-${Math.random()}`, file: file, status: 'pending', convertedData: null });
            }
        });
        renderFileList();
        updateControlsVisibility();
    }

    // --- UI Rendering ---
    function renderFileList() {
        fileList.innerHTML = '';
        filesToProcess.forEach(item => {
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
                default:
                    actionButtonHtml = `<button class="btn btn-primary convert-single" data-id="${item.id}">Convert</button>`;
            }

            li.innerHTML = `<div class="file-info"><span>${item.file.name} (${originalSize} KB)</span></div><div class="file-actions">${actionButtonHtml}<button class="remove-file" data-id="${item.id}">&times;</button></div>`;
            fileList.appendChild(li);
        });
    }

    function updateControlsVisibility() {
        controlsArea.style.display = filesToProcess.length > 0 ? 'block' : 'none';
    }
    
    // --- EVENT LISTENERS ---
    fileList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const id = button.dataset.id;
        if (button.classList.contains('remove-file')) {
            filesToProcess = filesToProcess.filter(item => item.id !== id);
            renderFileList();
            updateControlsVisibility();
        } else if (button.classList.contains('convert-single')) {
            convertSingleFile(id);
        } else if (button.classList.contains('download-file')) {
            downloadSingleFile(id);
        }
    });

    clearBtn.addEventListener('click', () => { filesToProcess = []; renderFileList(); updateControlsVisibility(); });
    convertAllBtn.addEventListener('click', () => { filesToProcess.forEach(item => item.status === 'pending' && convertSingleFile(item.id)); });

    // --- Conversion & Download Logic ---
    function getQualityMultiplier() {
        const quality = qualitySelect.value;
        switch (quality) {
            case 'original': return 1.0;
            case 'less': return 0.8;
            case 'recommended': return 0.6;
            case 'best': return 0.4;
            default: return 0.6;
        }
    }

    function convertSingleFile(id) {
        const item = filesToProcess.find(f => f.id === id);
        if (!item || item.status !== 'pending') return;
        item.status = 'converting';
        renderFileList();
        
        // STUB: SIMULATED CONVERSION LOGIC
        setTimeout(() => {
            item.status = 'done';
            const multiplier = getQualityMultiplier();
            const format = formatSelect.value;
            // For non-jpeg/webp, we can simulate a smaller but less drastic size change
            const finalMultiplier = ['jpeg', 'webp'].includes(format) ? multiplier : 0.9;

            item.convertedData = {
                blob: new Blob(['dummy content'], { type: `image/${format}` }),
                name: item.file.name.replace(/\.[^/.]+$/, `.${format}`),
                size: item.file.size * finalMultiplier,
            };
            renderFileList();
        }, 1500);
    }
    
    function downloadSingleFile(id) {
        const item = filesToProcess.find(f => f.id === id);
        if (!item || !item.convertedData) return;
        const url = URL.createObjectURL(item.convertedData.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.convertedData.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- DYNAMIC SLUG, TITLE, and UI LOGIC ---
    function toggleQualitySelector() {
        const selectedFormat = formatSelect.value;
        // Show quality options only for formats that support it
        if (selectedFormat === 'jpeg' || selectedFormat === 'webp') {
            qualityControl.style.display = 'block';
        } else {
            qualityControl.style.display = 'none';
        }
    }
    
    function updateToolState(format) {
        if (!format) format = 'webp';
        
        window.location.hash = `image-to-${format}`;
        const upperFormat = format.toUpperCase();
        document.title = `Free Image to ${upperFormat} Converter | ThisSupposeToBeFree`;
        const h1 = document.querySelector('.tool-header h1');
        if (h1) h1.textContent = `Image to ${upperFormat} Converter`;
        
        const schemaElement = document.getElementById('schema-json');
        if (schemaElement) {
            const schema = JSON.parse(schemaElement.textContent);
            schema.name = `Free Image to ${upperFormat} Converter`;
            schema.description = `A free, browser-based tool to convert images to the ${upperFormat} format.`;
            schemaElement.textContent = JSON.stringify(schema, null, 2);
        }
        toggleQualitySelector(); // Update UI
    }

    formatSelect.addEventListener('change', () => updateToolState(formatSelect.value));

    function initializeToolState() {
        const hash = window.location.hash;
        let initialFormat = 'webp';
        if (hash && hash.startsWith('#image-to-')) {
            const formatFromHash = hash.replace('#image-to-', '');
            if ([...formatSelect.options].some(opt => opt.value === formatFromHash)) {
                initialFormat = formatFromHash;
            }
        }
        formatSelect.value = initialFormat;
        updateToolState(initialFormat);
    }

    // Initialize the tool
    document.addEventListener('DOMContentLoaded', initializeToolState);
    if (document.readyState === 'complete') {
      initializeToolState();
    }
}
