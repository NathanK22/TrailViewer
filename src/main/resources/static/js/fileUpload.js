document.getElementById("gpxFile").addEventListener("change", function(event) {
    const file = event.target.files[0];
    const filenameDisplay = document.getElementById("filename-display");

    if (file) {
        filenameDisplay.textContent = `Selected file: ${file.name}`;
    } else {
        filenameDisplay.textContent = "";
    }
})

// works for now to stop error message if someone spams it
// maybe add something to actually disable button and enable given some circumstance
let isUploading = false;

function uploadFile() {
    if (isUploading) return;

    const fileInput = document.getElementById('gpxFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a GPX file first.');
        return;
    }

    // make sure only gpx... maybe xml/csv some day

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    if (fileExtension !== "gpx") {
        alert("Please select a GPX file");
        return;
    }

    isUploading = true;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/analyze', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Store the analysis results in sessionStorage
        sessionStorage.setItem('analysisResults', JSON.stringify(data));
        // Redirect to the map page
        window.location.href = '/map';
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while analyzing the GPX file.');
    })
    .finally(() => {
        setTimeout(() => {
            isUploading = false;
        }, 2000);
    });
}