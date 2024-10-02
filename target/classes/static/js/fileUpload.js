function uploadFile() {
    const fileInput = document.getElementById('gpxFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a GPX file first.');
        return;
    }

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
    });
}