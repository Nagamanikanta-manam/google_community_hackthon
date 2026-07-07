import { useRef, useState } from 'react';

const MAX_DIMENSION = 800;

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ onSelected }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    onSelected(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button type="button" className="icon-btn" onClick={() => inputRef.current?.click()}>
        <span aria-hidden="true">📷</span>
        <span className="label">Add photo</span>
      </button>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview of the photo you attached"
          style={{ marginTop: 10, maxWidth: '100%', borderRadius: 10 }}
        />
      )}
    </div>
  );
}
