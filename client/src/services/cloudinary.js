import axios from 'axios'
import { api } from './api.js'

export async function uploadCloudinaryImage(file, purpose, onProgress) {
  const { data } = await api.post('/media/signature', { purpose })
  const upload = data.data.upload
  const body = new FormData()
  body.append('file', file)
  body.append('api_key', upload.apiKey)
  body.append('timestamp', String(upload.timestamp))
  body.append('folder', upload.folder)
  body.append('public_id', upload.public_id)
  body.append('allowed_formats', upload.allowed_formats)
  body.append('overwrite', String(upload.overwrite))
  body.append('signature', upload.signature)

  const response = await axios.post(upload.uploadUrl, body, {
    timeout: 60000,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
  if (typeof response.data.secure_url !== 'string') {
    throw new Error('Cloudinary did not return a secure image URL.')
  }
  return response.data.secure_url
}
