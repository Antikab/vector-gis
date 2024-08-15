import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
	const [mapsData, setMapsData] = useState({});
	const [yesterdayMapsData, setYesterdayMapsData] = useState({});
	const [sortOrders, setSortOrders] = useState({});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);

	const fetchDataConfig = {
		method: 'get',
		maxBodyLength: Infinity,
		url: 'http://glavapu-services:3009/todayCache',
		// url: 'http://172.18.204.214:3009/todayCache',

		headers: {},
	};

	const fetchYesterdayDataConfig = {
		method: 'get',
		maxBodyLength: Infinity,
		url: 'http://glavapu-services:3009/yesterdayCache',
		// url: 'http://172.18.204.214:3009/yesterdayCache',
		headers: {},
	};

	useEffect(() => {
		fetchData();
		fetchDataYesterday();
	}, []);

	const fetchData = async () => {
		try {
			// Симуляция прогресса загрузки
			let simulatedProgress = 0;
			const interval = setInterval(() => {
				simulatedProgress += 10; // Увеличиваем прогресс на 10% каждые 100ms
				setProgress(simulatedProgress);
				if (simulatedProgress >= 100) {
					clearInterval(interval);
				}
			}, 100);

			const response = await axios.request(fetchDataConfig);
			setMapsData(response.data);
			setLoading(false);
			setProgress(100); // Установите прогресс в 100% после успешной загрузки
		} catch (error) {
			setError('Ошибка загрузки данных');
			setLoading(false);
			setProgress(100); // Установите прогресс в 100% даже в случае ошибки
		}
	};

	const fetchDataYesterday = async () => {
		try {
			// Симуляция прогресса загрузки
			let simulatedProgress = 0;
			const interval = setInterval(() => {
				simulatedProgress += 10; // Увеличиваем прогресс на 10% каждые 100ms
				setProgress(simulatedProgress);
				if (simulatedProgress >= 100) {
					clearInterval(interval);
				}
			}, 100);

			const response = await axios.request(fetchYesterdayDataConfig);
			setYesterdayMapsData(response.data);
			setLoading(false);
			setProgress(100); // Установите прогресс в 100% после успешной загрузки
		} catch (error) {
			setError('Ошибка загрузки данных');
			setLoading(false);
			setProgress(100); // Установите прогресс в 100% даже в случае ошибки
		}
	};

	const convertTimestampToDate = (timestamp) => {
		if (!timestamp || timestamp === 0) {
			return 'время - неизвестно';
		}
		const date = new Date(timestamp * 1000);
		return date.toLocaleString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	const handleSort = (mapKey, sortBy) => {
		const currentOrder = sortOrders[mapKey] || 'asc';
		const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

		const sortedLayers = [...mapsData[mapKey]].sort((a, b) => {
			const aTimestamp =
				sortBy === 'today'
					? a.timestamp
					: yesterdayMapsData[mapKey]?.find((layer) => layer.code === a.code)
							?.timestamp;
			const bTimestamp =
				sortBy === 'today'
					? b.timestamp
					: yesterdayMapsData[mapKey]?.find((layer) => layer.code === b.code)
							?.timestamp;

			if (!aTimestamp) return 1;
			if (!bTimestamp) return -1;
			return newOrder === 'asc'
				? aTimestamp - bTimestamp
				: bTimestamp - aTimestamp;
		});

		setSortOrders((prevSortOrders) => ({
			...prevSortOrders,
			[mapKey]: newOrder,
		}));

		setMapsData((prevMapsData) => ({
			...prevMapsData,
			[mapKey]: sortedLayers,
		}));
	};

	if (loading)
		return (
			<div className="loading-container">
				<progress
					value={progress}
					max="100"
				/>
				<p>Загрузка слоев... {progress}%</p>
			</div>
		);
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="App">
			<h1>Информация о слоях</h1>
			{Object.keys(mapsData).length === 0 ? (
				<p>Нет доступных слоев.</p>
			) : (
				Object.keys(mapsData).map((mapKey) => {
					const hasValidTimestamp = mapsData[mapKey].some(
						(layer) => layer.timestamp
					);

					return (
						<details
							key={mapKey}
							className="accordion-item"
						>
							<summary className="accordion-header">
								<h2>{mapKey}</h2>
								<span className="arrow">▼</span>
							</summary>
							<div className="accordion-content">
								<table>
									<thead>
										<tr>
											<th>Название слоя</th>
											<th>Название кода</th>
											<th>
												<div className="wrapper-date">
													<span>Вчерашняя дата</span>
													{hasValidTimestamp &&
														yesterdayMapsData[mapKey]?.length > 2 && (
															<button
																className={`sort-icon ${sortOrders[mapKey]}`}
																onClick={() => handleSort(mapKey, 'yesterday')}
															>
																{sortOrders[mapKey] === 'asc' ? '↑' : '↓'}
															</button>
														)}
												</div>
											</th>
											<th>
												<div className="wrapper-date">
													<span>Актуальная дата</span>
													{hasValidTimestamp &&
														mapsData[mapKey]?.length > 2 && (
															<button
																className={`sort-icon ${sortOrders[mapKey]}`}
																onClick={() => handleSort(mapKey, 'today')}
															>
																{sortOrders[mapKey] === 'asc' ? '↑' : '↓'}
															</button>
														)}
												</div>
											</th>
										</tr>
									</thead>
									<tbody>
										{mapsData[mapKey].map((layer) => {
											const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
												(yesterdayLayer) => yesterdayLayer.code === layer.code
											);

											return (
												<tr key={layer.id || `${mapKey}-${layer.code}`}>
													<td>{layer.name || 'Без названия'}</td>
													<td
														className={layer.type === 'folder' ? 'folder' : ''}
													>
														{layer.code}
													</td>
													<td
														className={!yesterdayLayer?.timestamp ? 'red' : ''}
													>
														{convertTimestampToDate(yesterdayLayer?.timestamp)}
													</td>
													<td className={!layer.timestamp ? 'red' : ''}>
														{convertTimestampToDate(layer.timestamp)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</details>
					);
				})
			)}
		</div>
	);
}

export default App;
