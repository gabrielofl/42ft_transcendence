import profilePerformance from "./profile-performance.html?raw";
import { apiService } from '../services/api.js';
import { replaceTemplatePlaceholders } from "./utils";
import { API_BASE_URL } from "./config";
// import Chart from '@toast-ui/chart';
// import '@toast-ui/chart/dist/toastui-chart.min.css';
// import Chart from 'chart.js/auto'

export function renderPerformanceTab() {
	const container = document.getElementById('profile-content');
	if (!container) return ;
  	try {
		container.innerHTML = replaceTemplatePlaceholders(profilePerformance, {API_BASE_URL});
		setupPerformanceTab();
	} catch (err) {
    console.error("Failed to load performance:", err);
    container.innerHTML = `<p class="text-red-500">Failed to load performance tab.</p>`;
  	}
}

export async function setupPerformanceTab() {
	try {

		// const res = await fetch(`${API_BASE_URL}/profile/ai-stats`, {
		// 	credentials: 'include', 
		// });
		const res = await fetch(`${API_BASE_URL}/users/me`, {
			credentials: 'include',
			headers: {
				'Authorization': `Bearer ${localStorage.getItem('token')}`
			}
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Backend error: ${text}`);
		}

		const container = document.getElementById('accuracy-chart')!;
		if (!container) {
			console.error("Chart container not found!");
			return;
		}
		container.style.width = '100%';
		container.style.height = '500px';
		container.innerHTML = '';

		// const data = await res.json();


// tui.chart
// const data = {
//  categories: ['Wins', 'Losses', 'Rate', 'Matches', 'Time', 'Max Score'],
// 			series: [
// 			{
// 				name: 'This Month',
// 				data: [50, 30, 50, 70, 60, 40],
// 			},
// 			],
// };

// const myRadarTheme = {
//   series: {
//     colors: ['#FF6347']  // customize main color(s)
//   }
  
// };

// // register the theme
// // Chart.registerTheme('myRadarTheme', myRadarTheme);

// const options = {
//   chart: {
//     width: 500,
//     height: 400,
//   },
//   theme: 'myRadarTheme',
//   legend: {
//     visible: false, // hide legend
//   },
  
// };

// // // // create the radar chart
// const chart = new Chart.RadarChart({
//   el: container, // ✅ matches your "accuracy-chart"
//   data,
//   options,
// });


// Chart.js

// const data = {
//   labels: [
//     'Eating',
//     'Drinking',
//     'Sleeping',
//     'Designing',
//     'Coding',
//     'Cycling',
//     'Running'
//   ],
//   datasets: [{
//     label: 'My First Dataset',
//     data: [65, 59, 90, 81, 56, 55, 40],
//     fill: true,
//     backgroundColor: 'rgba(255, 99, 132, 0.2)',
//     borderColor: 'rgb(255, 99, 132)',
//     pointBackgroundColor: 'rgb(255, 99, 132)',
//     pointBorderColor: '#fff',
//     pointHoverBackgroundColor: '#fff',
//     pointHoverBorderColor: 'rgb(255, 99, 132)'
//   }, {
//     label: 'My Second Dataset',
//     data: [28, 48, 40, 19, 96, 27, 100],
//     fill: true,
//     backgroundColor: 'rgba(54, 162, 235, 0.2)',
//     borderColor: 'rgb(54, 162, 235)',
//     pointBackgroundColor: 'rgb(54, 162, 235)',
//     pointBorderColor: '#fff',
//     pointHoverBackgroundColor: '#fff',
//     pointHoverBorderColor: 'rgb(54, 162, 235)'
//   }]
// };

// const config = {
//   type: 'radar',
//   data: data,
//   options: {
//     elements: {
//       line: {
//         borderWidth: 3
//       }
//     }
//   },
// };

//  new Chart(
//     document.getElementById('accuracy-chart'),
//     {
//         type: 'radar',
// 		data: data,
// 		options: {
// 			elements: {
// 			line: {
// 				borderWidth: 3
// 			}
// 			}
// 		},
//     }
//   );

// (async function() {
//   const data = [
//     { year: 2010, count: 10 },
//     { year: 2011, count: 20 },
//     { year: 2012, count: 15 },
//     { year: 2013, count: 25 },
//     { year: 2014, count: 22 },
//     { year: 2015, count: 30 },
//     { year: 2016, count: 28 },
//   ];

//   new Chart(
//     document.getElementById('accuracy-chart'),
//     {
//       type: 'bar',
//       data: {
//         labels: data.map(row => row.year),
//         datasets: [
//           {
//             label: 'Acquisitions by year',
//             data: data.map(row => row.count)
//           }
//         ]
//       }
//     }
//   );
// })();

 

 







	 // tui.chart
		
	// const chart = Chart.radarChart({
	// 	el: container,
	// 	data: {
	// 		categories: ['Wins', 'Losses', 'Rate', 'Matches', 'Time', 'Max Score'],
	// 		series: [
	// 		{
	// 			name: 'This Month',
	// 			data: [50, 30, 50, 70, 60, 40],
	// 		},
	// 		],
	// 	},
	// 	options: {
	// 		theme: {
	// 			chart: {
	// 								backgroundColor: 'rgba(0, 0, 0, 0)',
	// 							},
	// 			plot: {
	// 				lineColor: '#fffcf2',   // background grid lines
	// 				lineWidth: 2,
	// 				backgroundColor:'rgba(0, 80, 180, 0.1)'
	// 			},
	// 			circularAxis: {
	// 				label: {
	// 				color: '#ffff66',     // category labels color
	// 				},
	// 				lineColor: '#fffcf2',   // circular lines (outer rings)
	// 			},
	// 			radialAxis: {
	// 				label: {
	// 				color: '#ffff66',     // angle axis labels (if shown)
	// 				},
	// 				lineColor: '#fffcf2',   // radial lines
	// 			},
	// 			series: {
	// 				colors: ['#ff00ff'],    // radar shape color
	// 				areaOpacity: 0.5,       // semi-transparent fill
	// 				lineWidth: 3,
	// 				dot: {
	// 				radius: 4,
	// 				color: '#ff00ff',
	// 				},
	// 			},
	// 		},
	// 		legend: {
	// 		visible: false,
	// 		},
	// 	},
	// 	});
	} catch (err) {
		console.error('Error loading stats:', err);
	}
}

  export function renderFriendsTab(): string {
	return `
	  <div class="text-white space-y-6">
		<h2 class="text-2xl font-bold mb-4">Powerup Store</h2>

		<div id="powerup-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6">
		  <!-- Filled dynamically -->
		</div>
	  </div>
	`;
}