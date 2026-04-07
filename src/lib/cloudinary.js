// lib/cloudinary.js — رفع الصور والفيديوهات لـ Cloudinary

const CLOUD_NAME = "dkfmfntpa";
const UPLOAD_PRESET = "orbit_unsigned"; // أنشئ unsigned preset في Cloudinary Dashboard

export async function uploadMedia(file, folder = "orbit/posts") {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) throw new Error("فشل رفع الملف");
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

export function optimizeUrl(url, { width = 400, quality = "auto" } = {}) {
  // تحسين جودة الصورة تلقائياً
  return url.replace("/upload/", `/upload/w_${width},q_${quality},f_auto/`);
}
