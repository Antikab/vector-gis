import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import serviceNames from './components/serviceNames';
// import { testData, testYesterdayData } from './components/testData';

function App() {
	const [mapsData, setMapsData] = useState({});
	const [yesterdayMapsData, setYesterdayMapsData] = useState({});
	const [sortOrders, setSortOrders] = useState({});
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);
	const [filteredMapsData, setFilteredMapsData] = useState({});
	const [isFiltered, setIsFiltered] = useState(false); // добавляем состояние для отслеживания состояния фильтра

	// Функция для извлечения номера из `mapKey`
	const extractServiceNumber = (mapKey) => {
		const match = mapKey.match(/\d+/);
		return match ? parseInt(match[0], 10) : null;
	};

	// Функция для симуляции прогресса загрузки
	const simulateProgress = () => {
		let simulatedProgress = 0;
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				simulatedProgress += 10;
				setProgress(simulatedProgress);
				if (simulatedProgress >= 100) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
		});
	};

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

	const fetchData = async () => {
		// const fetchTestData = async () => {
		try {
			// Симуляция прогресса загрузки
			await simulateProgress();

			const response = await axios.request(fetchDataConfig);

			// Сортировка данных: сначала по числовым значениям, затем по строкам
			const sortedKeys = Object.keys(response.data).sort((a, b) => {
				// const sortedKeys = Object.keys(testData).sort((a, b) => {
				const aNumber = extractServiceNumber(a);
				const bNumber = extractServiceNumber(b);

				if (aNumber !== null && bNumber !== null) {
					// Если оба ключа содержат числа, сортируем по ним
					return aNumber - bNumber;
				} else if (aNumber !== null) {
					// Если только aNumber существует, он идет раньше
					return -1;
				} else if (bNumber !== null) {
					// Если только bNumber существует, он идет раньше
					return 1;
				} else {
					// Если оба значения не числовые, сортируем их как строки
					return a.localeCompare(b);
				}
			});

			const sortedData = sortedKeys.reduce((acc, key) => {
				acc[key] = response.data[key];
				// acc[key] = testData[key];
				return acc;
			}, {});

			setMapsData(sortedData);
			setProgress(100); // Установите прогресс в 100% после успешной загрузки
		} catch (error) {
			setError('Ошибка загрузки данных');
			setProgress(100); // Установите прогресс в 100% даже в случае ошибки
		}
	};

	const fetchDataYesterday = async () => {
		// const fetchTestDataYesterday = async () => {
		try {
			// Симуляция прогресса загрузки
			await simulateProgress();
			const response = await axios.request(fetchYesterdayDataConfig);
			setYesterdayMapsData(response.data);
			// setYesterdayMapsData(testYesterdayData);
			setProgress(100); // Установите прогресс в 100% после успешной загрузки
		} catch (error) {
			setError('Ошибка загрузки данных');
			setProgress(100); // Установите прогресс в 100% даже в случае ошибки
		}
	};

	useEffect(() => {
		if (progress === 100) {
			setLoading(false);
		}
	}, [progress]);

	// useEffect(() => {
	// 	const fetchData = async () => {
	// 		await fetchTestData();
	// 		await fetchTestDataYesterday();
	// 	};

	// 	fetchData();
	// }, []);

	useEffect(() => {
		fetchData();
		fetchDataYesterday();
	}, []);

	const convertTimestampToDate = (timestamp, type) => {
		if (type === 'folder') {
			return null; // Для типа folder не возвращаем ничего
		}
		if (!timestamp || timestamp === 0) {
			return 'время неизвестно';
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

	const filterChangedLayers = () => {
		// Фильтруем только те сервисы, в которых есть изменения
		const filteredData = Object.keys(mapsData).reduce((acc, mapKey) => {
			const hasMismatch = mapsData[mapKey].some((layer) => {
				const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
					(yesterdayLayer) => yesterdayLayer.code === layer.code
				);
				return (
					yesterdayLayer?.timestamp &&
					layer.timestamp &&
					yesterdayLayer.timestamp !== layer.timestamp
				);
			});

			if (hasMismatch) {
				acc[mapKey] = mapsData[mapKey]; // Сохраняем только те данные, которые были изменены
			}

			return acc;
		}, {});

		// Обновляем состояние
		setFilteredMapsData(filteredData);
		setIsFiltered(true); // Устанавливаем состояние фильтрации в true
	};

	if (loading)
		return (
			<div className="loading-wrapper">
				<div className="loading-container">
					<progress
						value={progress}
						max="100"
					/>
					<span>{progress}%</span>
					<p>Загрузка слоев...</p>
				</div>
			</div>
		);
	if (error) return <p>Error: {error}</p>;

	return (
		<div className="wrapper">
			<h1>
				{' '}
				Информация о слоях в{' '}
				<a
					href="http://vector.mka.mos.ru/gis/"
					target="_blank"
					rel="noopener noreferrer"
				>
					ВекторГИС{' '}
				</a>{' '}
			</h1>
			<div className="wrapper-button">
				<button
					className="sort-button"
					onClick={
						isFiltered ? () => setIsFiltered(false) : filterChangedLayers
					}
				>
					{isFiltered ? 'Показать все слои' : 'Показать измененные слои'}
				</button>
				<input
					type="date"
					onChange={() => console.log('date')}
				/>
			</div>
			{Object.keys(isFiltered ? filteredMapsData : mapsData).length === 0 ? (
				<p>Нет доступных слоев.</p>
			) : (
				Object.keys(isFiltered ? filteredMapsData : mapsData).map((mapKey) => {
					const serviceNumber = extractServiceNumber(mapKey);
					const serviceName = serviceNames[serviceNumber];

					const hasMismatch = mapsData[mapKey].some((layer) => {
						const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
							(yesterdayLayer) => yesterdayLayer.code === layer.code
						);
						return (
							yesterdayLayer?.timestamp &&
							layer.timestamp &&
							yesterdayLayer.timestamp !== layer.timestamp
						);
					});

					const hasValidTimestamp = mapsData[mapKey].some(
						(layer) => layer.timestamp
					);
					return (
						<details
							key={mapKey}
							className={`accordion-item ${
								hasMismatch ? 'highlight-accordion' : ''
							}`}
						>
							<summary
								className={`accordion-header ${
									hasMismatch ? 'highlight-accordion-open' : ''
								}`}
							>
								<h2>
									Сервис {''}
									{serviceName
										? `${serviceNumber} - ${serviceName}`
										: `${mapKey.replace('map', '')}`}
								</h2>
								<span className="accordion-indicator"></span>
							</summary>
							<div className="accordion-content">
								<table>
									<thead
										className={`thead-header ${
											hasMismatch ? 'thead-highlight' : ''
										}`}
									>
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
															></button>
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
															></button>
														)}
												</div>
											</th>
											<th>Скачать geojson</th>
										</tr>
									</thead>

									{mapsData[mapKey].map((layer) => {
										const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
											(yesterdayLayer) => yesterdayLayer.code === layer.code
										);

										const hasDateMismatch =
											yesterdayLayer?.timestamp &&
											layer.timestamp &&
											yesterdayLayer.timestamp !== layer.timestamp;

										return (
											<tbody key={layer.id || `${mapKey}-${layer.code}`}>
												<tr className={hasDateMismatch ? 'highlight-row' : ''}>
													<td>{layer.name || 'Без названия'}</td>
													<td
														className={layer.type === 'folder' ? 'folder' : ''}
													>
														{layer.code}
													</td>
													<td
														className={
															!yesterdayLayer?.timestamp &&
															layer.type !== 'folder'
																? 'time-null'
																: ''
														}
													>
														{convertTimestampToDate(
															yesterdayLayer?.timestamp,
															layer.type
														)}
													</td>
													<td
														className={
															!layer?.timestamp && layer.type !== 'folder'
																? 'time-null'
																: ''
														}
													>
														{convertTimestampToDate(
															layer.timestamp,
															layer.type
														)}
													</td>
													<td>
														{layer.type === 'folder' ? (
															''
														) : (
															<div className="link-wrapper">
																<a
																	href={`http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`}
																	className="button"
																>
																	Скачать
																</a>
																<a
																	// href={`http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`}
																	className="button"
																>
																	Загрузить в БД
																</a>
															</div>
														)}
													</td>
												</tr>
											</tbody>
										);
									})}
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
