import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

  return {
	root: 'src',
	publicDir: '../public',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
	  },
	server: {
    host: '0.0.0.0',
    port: 5173,
		strictPort: true,
	allowedHosts: ['frontend'],
	watch: {
    usePolling: true,
		interval: 100
  }
  }
  };
});
