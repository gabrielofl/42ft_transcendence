// import { defineConfig, loadEnv } from 'vite';

// export default defineConfig(({ mode }) => {
// 	const env = loadEnv(mode, process.cwd(), '');

//   return {
//     root: 'src',
//     build: {
//       outDir: '../dist',
//       emptyOutDir: true,
// 	  },
// 	server: {
//     host: '0.0.0.0',
//     port: 5173,
// 		strictPort: true,
// 	allowedHosts: ['frontend'],
// 	watch: {
//     usePolling: true,
// 		interval: 100
//   }
//   }
//   };
// });

import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    root: 'src',
    publicDir: '../public',
    resolve: {
      alias: {
        '@shared': resolve(__dirname, './src/shared'),
      },
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    server: {
      fs: {
        allow: ['..'], // 👈 Permitir acceder a carpetas fuera de src
      },
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      https: {
        key: fs.readFileSync('certs/privkey.pem'),
        cert: fs.readFileSync('certs/fullchain.pem')
      },
      allowedHosts: ['frontend'],
      watch: {
        usePolling: true,
        interval: 100
      }
    }
  };
});
