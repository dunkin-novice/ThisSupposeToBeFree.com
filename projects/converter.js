// Wrap all logic to ensure it only runs on the converter page
if (document.getElementById('upload-area')) {
    
    // --- DOM Element References ---
    const uploadArea = document.getElementById('upload-area');
    const dragOverlay = document.getElementById('drag-overlay');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const controlsArea = document.getElementById('controls-area');
    const formatSelect = document.getElementById('format-select');
    const convertAllBtn = document.getElementById('convert-btn'); // Renamed for clarity
    const clearBtn = document.getElementById('clear-btn');
    
    // --- State Management ---
    let filesToProcess = [];
    let dragCounter = 0;
    
    // --- GLOBAL DRAG AND DROP HANDLERS ---
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
        e.stopPropagation();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dragOverlay.classList.remove('visible');
        handleFiles(e.dataTransfer.files);
    });

    // --- Core File Handling ---
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    function handleFiles(newFiles) {
        [...newFiles].forEach(file => {
            if (!filesToProcess.some(f => f.file.name === file.name && f.file.size === file.size)) {
                filesToProcess.push({
                    id: `file-${Date.now()}-${Math.random()}`,
                    file: file,
                    status: 'pending',
                    convertedData: null,
                });
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
    
    // --- EVENT LISTENER FOR DYNAMIC BUTTONS ---
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

    clearBtn.addEventListener('click', () => {
        filesToProcess = [];
        renderFileList();
        updateControlsVisibility();
    });
    
    // --- "CONVERT ALL" BUTTON LOGIC ---
    convertAllBtn.addEventListener('click', () => {
        filesToProcess.forEach(item => {
            if (item.status === 'pending') {
                convertSingleFile(item.id);
            }
        });
    });

    // --- Conversion & Download Logic ---
    function convertSingleFile(id) {
        const item = filesToProcess.find(f => f.id === id);
        if (!item || item.status !== 'pending') return;

        item.status = 'converting';
        renderFileList();
        
        // --- STUB: SIMULATED CONVERSION LOGIC ---
        // Replace this with your actual file conversion code
        setTimeout(() => {
            item.status = 'done';
            const simulatedBlob = new Blob(['dummy content'], { type: `image/${formatSelect.value}` });
            item.convertedData = {
                blob: simulatedBlob,
                name: item.file.name.replace(/\.[^/.]+$/, `.${formatSelect.value}`),
                size: item.file.size * Math.random() * 0.8 // Simulate random size reduction
            };
            renderFileList();
        }, 1500);
    }
    
    function downloadSingleFile(id) {
        const item = filesToProcess.find(f => f.id === id);
        if (!item || item.status !== 'done' || !item.convertedData) return;
        
        const url = URL.createObjectURL(item.convertedData.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.convertedData.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- DYNAMIC SLUG, TITLE, and SCHEMA LOGIC ---
    function updateToolState(format) {
        if (!format) format = 'webp'; // Default format
        
        // 1. Update URL Hash (Slug)
        const newHash = `image-to-${format}`;
        if (window.location.hash !== `#${newHash}`) {
            window.location.hash = newHash;
        }
        
        // 2. Update Page Title
        const upperFormat = format.toUpperCase();
        document.title = `Free Image to ${upperFormat} Converter | ThisSupposeToBeFree`;
        
        // 3. Update H1 Tag
        const h1 = document.querySelector('.tool-header h1');
        if (h1) h1.textContent = `Image to ${upperFormat} Converter`;
        
        // 4. Update Schema Markup
        const schemaElement = document.getElementById('schema-json');
        if (schemaElement) {
            const schema = JSON.parse(schemaElement.textContent);
            schema.name = `Free Image to ${upperFormat} Converter`;
            schema.description = `A free, browser-based tool to convert images to the ${upperFormat} format without uploading files to a server.`;
            schemaElement.textContent = JSON.stringify(schema, null, 2);
        }
    }

    // When the user changes the dropdown
    formatSelect.addEventListener('change', () => {
        updateToolState(formatSelect.value);
    });

    // On page load, read the hash and set the state
    function initializeToolState() {
        const hash = window.location.hash;
        let initialFormat = 'webp'; // Default to WEBP
        if (hash && hash.startsWith('#image-to-')) {
            const formatFromHash = hash.replace('#image-to-', '');
            if ([...formatSelect.options].some(opt => opt.value === formatFromHash)) {
                initialFormat = formatFromHash;
            }
        }
        formatSelect.value = initialFormat;
        updateToolState(initialFormat);
    }

    // Initialize the tool when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', initializeToolState);
    // Also run immediately in case DOM is already loaded
    if (document.readyState === 'complete') {
      initializeToolState();
    }
}
