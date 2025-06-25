/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,ts}'], // include your actual paths
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Helvetica Neue"', 'Arial', 'sans-serif'],
				press: ['"Press Start 2P"', 'monospace'],
			},
			animation: {
				'score-bump': 'bump 0.3s ease-in-out',
				'pulse': 'pulse 2s infinite',
				'ping': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
			},
			keyframes: {
				bump: {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.4)' },
					'100%': { transform: 'scale(1)' },
				},
			},
		},
	},
	plugins: [],
};
