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
    let filesToProcess = [];
    let dragCounter = 0; // Fixes the flickering overlay bug
    let isConverting = false; // Fixes the race condition bug
    
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
        e.stopPropagation(); // Necessary to allow drop
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dragOverlay.classList.remove('visible');
        const droppedFiles = e.dataTransfer.files;
        handleFiles(droppedFiles);
    });

    // --- File Input Handler ---
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    // --- Core File Handling Logic ---
    function handleFiles(newFiles) {
        if (isConverting) return;
        
        [...newFiles].forEach(file => {
            // Avoid duplicates
            if (!filesToProcess.some(f => f.name === file.name && f.size === file.size)) {
                filesToProcess.push(file);
            }
        });
        renderFileList();
        updateControlsVisibility();
    }

    // --- UI Rendering ---
    function renderFileList() {
        fileList.innerHTML = ''; // Clear existing list
        filesToProcess.forEach((file, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="remove-file" data-index="${index}">&times;</button>
            `;
            fileList.appendChild(li);
        });
    }

    function updateControlsVisibility() {
        if (filesToProcess.length > 0) {
            controlsArea.style.display = 'block';
        } else {
            controlsArea.style.display = 'none';
        }
    }
    
    // --- Event Listeners for Actions ---
    fileList.addEventListener('click', (e) => {
        if (isConverting) return;
        if (e.target.classList.contains('remove-file')) {
            const indexToRemove = parseInt(e.target.dataset.index, 10);
            filesToProcess.splice(indexToRemove, 1);
            renderFileList();
            updateControlsVisibility();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        if (isConverting) return;
        filesToProcess = [];
        renderFileList();
        updateControlsVisibility();
    });

    convertBtn.addEventListener('click', () => {
        if (isConverting || filesToProcess.length === 0) return;
        
        isConverting = true;
        // START: redesign enhancement - disable buttons
        convertBtn.disabled = true;
        convertBtn.textContent = 'Converting...';
        clearBtn.disabled = true;
        // END: redesign enhancement

        // --- STUB: Actual Conversion Logic ---
        // This is where you would loop through `filesToProcess` and
        // use a library like canvas to perform the conversion.
        console.log('Starting conversion process...');
        setTimeout(() => { // Simulating conversion
            console.log('Conversion complete!');
            
            isConverting = false;
            // START: redesign enhancement - re-enable buttons
            convertBtn.disabled = false;
            convertBtn.textContent = 'Convert All';
            clearBtn.disabled = false;
            // END: redesign enhancement

            alert('Conversion finished! (This is a placeholder)');

        }, 2000);
    });

} // End of converter page logic wrapper
