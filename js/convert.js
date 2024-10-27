// convert.js
(function() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('preview');
    const convertButton = document.getElementById('convertButton');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');

    // Store selected files
    let selectedFiles = [];

    // Maximum file size in bytes (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    
    // Supported image types
    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

    // Initialize drag and drop listeners
    function initializeDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, unhighlight, false);
        });

        dropzone.addEventListener('drop', handleDrop, false);
    }

    // Prevent default behaviors for drag and drop
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight dropzone when dragging files over it
    function highlight() {
        dropzone.classList.add('highlight');
    }

    // Remove highlight when dragging leaves or after drop
    function unhighlight() {
        dropzone.classList.remove('highlight');
    }

    // Handle dropped files
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // Process selected files
    function handleFiles(files) {
        const validFiles = Array.from(files).filter(validateFile);
        
        if (validFiles.length === 0) {
            alert('Please select valid image files (JPG, PNG, GIF) under 5MB.');
            return;
        }

        selectedFiles = [...selectedFiles, ...validFiles];
        updatePreview();
        convertButton.disabled = false;
    }

    // Validate individual file
    function validateFile(file) {
        if (!SUPPORTED_TYPES.includes(file.type)) {
            console.warn(`Invalid file type: ${file.type}`);
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            console.warn(`File too large: ${file.name}`);
            return false;
        }

        return true;
    }

    // Update preview section with selected images
    function updatePreview() {
        previewContainer.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            const preview = document.createElement('div');
            preview.className = 'preview-item';
            
            reader.onload = function(e) {
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <div class="preview-controls">
                        <button onclick="moveImage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button onclick="moveImage(${index}, 1)" ${index === selectedFiles.length - 1 ? 'disabled' : ''}>↓</button>
                        <button onclick="removeImage(${index})" class="remove-btn">×</button>
                    </div>
                `;
            };
            
            reader.readAsDataURL(file);
            previewContainer.appendChild(preview);
        });
    }

    // Move image in the order
    window.moveImage = function(index, direction) {
        if ((direction === -1 && index === 0) || 
            (direction === 1 && index === selectedFiles.length - 1)) {
            return;
        }

        const newIndex = index + direction;
        [selectedFiles[index], selectedFiles[newIndex]] = 
        [selectedFiles[newIndex], selectedFiles[index]];
        
        updatePreview();
    };

    // Remove image from selection
    window.removeImage = function(index) {
        selectedFiles.splice(index, 1);
        updatePreview();
        if (selectedFiles.length === 0) {
            convertButton.disabled = true;
        }
    };

    // Handle conversion button click
    convertButton.addEventListener('click', async function() {
        try {
            convertButton.disabled = true;
            convertButton.textContent = 'Converting...';
            
            const imageKeys = await uploadImages(selectedFiles);
            const pdfUrl = await convertToPDF(imageKeys);
            
            downloadLink.href = pdfUrl;
            downloadSection.style.display = 'block';
            
            // Clear selection after successful conversion
            selectedFiles = [];
            updatePreview();
            
        } catch (error) {
            console.error('Conversion failed:', error);
            alert('Failed to convert images to PDF. Please try again.');
        } finally {
            convertButton.disabled = false;
            convertButton.textContent = 'Convert to PDF';
        }
    });

    // Upload images to S3
    async function uploadImages(files) {
        const imageKeys = [];
        
        for (const file of files) {
            const key = `${Date.now()}-${file.name}`;
            await s3.upload({
                Bucket: _config.s3.imagesBucket,
                Key: key,
                Body: file,
                ContentType: file.type
            }).promise();
            
            imageKeys.push(key);
        }
        
        return imageKeys;
    }

    // Call conversion API
    async function convertToPDF(imageKeys) {
        const response = await fetch(`${_config.api.invokeUrl}/convert`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await getIdToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageKeys })
        });

        if (!response.ok) {
            throw new Error('Conversion failed');
        }

        const result = await response.json();
        
        // Generate download link
        const pdfUrl = await s3.getSignedUrl('getObject', {
            Bucket: _config.s3.pdfsBucket,
            Key: result.pdfKey,
            Expires: 3600
        });
        
        return pdfUrl;
    }

    // Initialize the component
    initializeDragAndDrop();
})();