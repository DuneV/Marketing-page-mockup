/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // output: 'export',  // Genera build estático
  
//   images: {
//     unoptimized: true, // Necesario para static export
//   },
//   typescript: {
//   ignoreBuildErrors: true, 
//   },
//   trailingSlash: true, // Mejor routing en Firebase
  
//   // Variables de entorno
//   env: {
//     NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//     NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//     NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//     NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
//     IMPORT_API_BASE_URL: process.env.IMPORT_API_BASE_URL,
//   },
// }

// export default nextConfig
