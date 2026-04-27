'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

const MAX_DIMENSION = 512;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB upload limit pré-resize
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload de foto de perfil pro Firebase Storage. Path:
 * `users/{uid}/avatar.jpg`. Storage rules (a configurar uma vez via
 * Firebase CLI ou Console) precisam permitir read public + write
 * `auth.uid == uid`.
 *
 * Faz redimensionamento client-side pra max 512px (lado maior),
 * convertendo pra JPEG 0.85 quality. Reduz tráfego e padroniza
 * formato sem precisar processamento server-side.
 *
 * Lança Error com mensagem PT-BR pra rejection (tipo inválido,
 * arquivo muito grande, etc).
 */
export async function uploadProfilePhoto(file: File, userId: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Use JPEG, PNG ou WebP.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Foto muito grande (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`);
  }

  const blob = await resizeImage(file, MAX_DIMENSION);
  const storage = getFirebaseStorage();
  const path = `users/${userId}/avatar.jpg`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=86400',
  });
  return getDownloadURL(fileRef);
}

/**
 * Resize via canvas. Mantém aspect ratio; redimensiona pelo lado maior
 * até `maxDim`. Re-encoda como JPEG quality 0.85.
 */
async function resizeImage(file: File, maxDim: number): Promise<Blob> {
  const img = await loadImage(file);
  const { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Falha ao codificar imagem.'));
        else resolve(blob);
      },
      'image/jpeg',
      0.85,
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
}
