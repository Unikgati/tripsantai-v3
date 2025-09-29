/**
 * Minimal Cloudinary unsigned upload helper.
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET env variables.
 */

export type CloudinaryUploadResult = { url: string; public_id: string };

export async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) throw new Error('Missing Cloudinary env variables')

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset)

  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        // return both secure_url and public_id so server can remove assets later
        if (res.secure_url && res.public_id) resolve({ url: res.secure_url, public_id: res.public_id })
        else if (res.secure_url) resolve({ url: res.secure_url, public_id: '' })
        else reject(new Error('Upload failed'))
      } catch (err) {
        reject(err)
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(form)
  })
}

export default uploadToCloudinary
