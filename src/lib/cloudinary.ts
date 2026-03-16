// ─── Cloudinary Upload Helper ─────────────────────────────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = 'teamup_uploads'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`

// الحد: لو الصورة أكبر من 500KB → ارفعها على Cloudinary
const BASE64_LIMIT = 500 * 1024

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`)
  const data = await res.json()
  return data.secure_url as string
}

export async function processImageFile(file: File): Promise<string> {
  if (file.size > BASE64_LIMIT) {
    // كبير → Cloudinary
    return await uploadToCloudinary(file)
  } else {
    // صغير → base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
