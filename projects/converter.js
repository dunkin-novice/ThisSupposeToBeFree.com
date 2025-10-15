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
    
    // --- State Management ---
    // MODIFIED: We now use an array of objects to track each file's status
    let filesToProcess = [];
    let dragCounter = 0;
    let isBatchConverting = false; // Flag for the "Convert All" button
    
    // --- Drag and Drop Handlers ---
    uploadArea.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        dragOverlay.classList.add('visible');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            dragOverlay.classList.remove('visible');
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    uploadArea.addEventListener('drop', (e) => {
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
            // Avoid duplicates
            if (!filesToProcess.some(f => f.file.name === file.name && f.file.size === file.size)) {
                // MODIFIED: Create a stateful object for each file
                const fileObject = {
                    id: `file-${Date.now()}-${Math.random()}`, // Unique ID for each file
                    file: file,
                    status: 'pending', // 'pending', 'converting', 'done', 'error'
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
        fileList.innerHTML = ''; // Clear existing list
        filesToProcess.forEach((item) => {
            const li = document.createElement('li');
            li.dataset.id = item.id; // Set ID on the list item for easy access

            const originalSize = (item.file.size / 1024).toFixed(1);
            let actionButtonHtml = '';

            // MODIFIED: Conditional rendering for the action button
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
                default: // 'pending'
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
        const item = filesToProcess.find(f => f.id === id);
        if (!item || item.status !== 'pending') return;

        item.status = 'converting';
        renderFileList(); // Re-render to show "Converting..." state

        // --- STUB: SIMULATED CONVERSION LOGIC ---
        // Replace this setTimeout with your actual canvas conversion logic
        setTimeout(() => {
            // Simulate success
            item.status = 'done';
            // Simulate a smaller file size after conversion
            const simulatedBlob = new Blob(['dummy content'], { type: 'image/png' });
            item.convertedData = {
                blob: simulatedBlob,
                name: item.file.name.replace(/\.[^/.]+$/, "") + ".png",
                size: item.file.size * 0.8 // Simulate 20% size reduction
            };
            renderFileList(); // Re-render to show the "Download" button
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
    
    clearBtn.addEventListener('click', () => {
        if (isBatchConverting) return;
        filesToProcess = [];
        renderFileList();
        updateControlsVisibility();
    });

    // Main "Convert All" button
    convertBtn.addEventListener('click', () => {
        // Here you could implement the logic to loop through all 'pending' files
        // and call convertSingleFile for each.
        alert('"Convert All" logic needs to be connected to the new system.');
    });

} // End of converter page logic wrapper
