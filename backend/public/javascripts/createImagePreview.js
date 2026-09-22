document.addEventListener('DOMContentLoaded', function () {
  function setupPreview(inputId, previewId, containerId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const container = document.getElementById(containerId);

    if (input && preview && container) {
      input.addEventListener('change', function () {
        const file = input.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = function (e) {
            preview.src = e.target.result;
            container.style.display = 'block';
          };
          reader.readAsDataURL(file);
        } else {
          preview.src = '';
          container.style.display = 'none';
        }
      });
    }
  }

  setupPreview('imageInput', 'imagePreview', 'previewContainer');
  
  setupPreview('profilePictureInput', 'profilePicturePreview', 'profilePicturePreviewContainer');
  setupPreview('logoInput', 'logoPreview', 'logoPreviewContainer');
});