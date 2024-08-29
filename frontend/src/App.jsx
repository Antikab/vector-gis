import axios from 'axios';
import { useState, useEffect } from 'react';
import './App.css';
import * as XLSX from 'xlsx-js-style';
// import { testData, testYesterdayData } from './components/testData';
import serviceNames from './components/serviceNames';
import {
	extractServiceNumber,
	getServiceName,
	sortKeys,
	checkForMismatch,
	convertTimestampToDate,
} from './components/utils';

function App() {
	const [mapsData, setMapsData] = useState({});
	const [yesterdayMapsData, setYesterdayMapsData] = useState({});
	const [sortOrders, setSortOrders] = useState({});
	const [error, setError] = useState(null);
	const [progress, setProgress] = useState(0);
	const [filteredMapsData, setFilteredMapsData] = useState({});
	const [isFiltered, setIsFiltered] = useState(false);
	const [loading, setLoading] = useState(true); // Объединено состояние загрузки

	const today = new Date().toISOString().split('T')[0];
	const [date, setDate] = useState('');

	const formattedDate = date.split('-').reverse().join('.'); // Форматирование выбранной даты
	const displayText = formattedDate ? formattedDate : 'Вчерашняя дата';

	const simulateProgress = async () => {
		let simulatedProgress = 0;

		while (simulatedProgress < 100) {
			await new Promise((resolve) => setTimeout(resolve, 80));
			simulatedProgress += 5;
			setProgress(simulatedProgress);
		}
	};

	const fetchData = async () => {
		try {
			await simulateProgress();
			const response = await axios.get(
				'http://glavapu-services:3009/todayCache'
			);
			const sortedKeys = sortKeys(
				Object.keys(response.data),
				extractServiceNumber
			);
			const sortedData = sortedKeys.reduce((acc, key) => {
				acc[key] = response.data[key];
				return acc;
			}, {});
			setMapsData(sortedData);
		} catch (error) {
			setError('Ошибка загрузки данных');
		}
	};

	const fetchYesterdayData = async () => {
		try {
			await simulateProgress();
			const response = await axios.get(
				'http://glavapu-services:3009/yesterdayCache'
			);
			setYesterdayMapsData(response.data);
		} catch (error) {
			setError('Ошибка загрузки данных');
		}
	};

	const handleDate = async (e) => {
		const selectedDate = e.target.value;
		setDate(selectedDate); // Обновляем состояние даты
		try {
			await simulateProgress();
			const response = await axios.get(
				`http://glavapu-services:3009/getCacheByDate/${selectedDate}`
			);
			setYesterdayMapsData(response.data);
		} catch (error) {
			console.log(error);
			setYesterdayMapsData({});
		}
	};

	useEffect(() => {
		const fetchAllData = async () => {
			await Promise.all([fetchData(), fetchYesterdayData()]);
			setLoading(false);
		};
		fetchAllData();
	}, []);

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
		const filteredData = Object.keys(mapsData).reduce((acc, mapKey) => {
			const hasMismatch = mapsData[mapKey].some((layer) => {
				const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
					(yesterdayLayer) => yesterdayLayer.code === layer.code
				);
				return checkForMismatch(layer, yesterdayLayer);
			});

			if (hasMismatch) {
				acc[mapKey] = mapsData[mapKey];
			}

			return acc;
		}, {});

		setFilteredMapsData(filteredData);
		setIsFiltered(true);
	};

	if (loading) {
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
	}

	if (error) return <p>Error: {error}</p>;

	function exportToExcel() {
		// Создаем новый Workbook
		const wb = XLSX.utils.book_new();

		// Создаем лист для данных
		const ws = XLSX.utils.aoa_to_sheet([]);

		// Создаем стили
		// const headerStyle = {
		// 	font: { bold: true, sz: 14 },
		// 	fill: { fgColor: { rgb: 'FADC80' } },
		// 	border: {
		// 		top: { style: 'thin' },
		// 		bottom: { style: 'thin' },
		// 		left: { style: 'thin' },
		// 		right: { style: 'thin' },
		// 	},
		// };

		// const downloadStyle = {
		// 	font: { bold: true, sz: 14 },
		// 	fill: { fgColor: { rgb: '8CB181' } },
		// };

		const linkStyle = {
			font: { color: { rgb: '0000FF' }, underline: true },
			// border: {
			// 	left: { style: 'thin' },
			// },
		};

		const cellStyle = {
			// border: {
			// 	top: { style: 'thin' },
			// 	bottom: { style: 'thin' },
			// 	left: { style: 'thin' },
			// 	right: { style: 'thin' },
			// },
		};

		const titleStyle = {
			font: { bold: true, sz: 16 },
			fill: { fgColor: { rgb: 'D3D3D3' } },
		};

		// Перебираем все сервисы и слои, чтобы добавить их в таблицу
		const sheetData = Object.keys(filteredMapsData).reduce(
			(acc, mapKey, index, arr) => {
				// Фильтруем только те слои, у которых есть расхождение в датах
				const mismatchedLayers = filteredMapsData[mapKey].filter((layer) => {
					const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
						(yesterdayLayer) => yesterdayLayer.code === layer.code
					);
					return checkForMismatch(layer, yesterdayLayer);
				});

				// Если нет слоев с расхождением, пропускаем этот сервис
				if (mismatchedLayers.length === 0) {
					return acc;
				}

				// Получаем имя сервиса
				const serviceName = getServiceName(mapKey, serviceNames);

				// Добавляем название сервиса как заголовок
				acc.push([
					{ v: serviceName, s: titleStyle }, // Применяем titleStyle к названию сервиса
					{ v: '', s: '' },
					{ v: '', s: '' },
					{ v: '', s: '' },
					{ v: '', s: '' },
				]);

				// Объединяем ячейки для заголовка сервиса
				// ws['!merges'] = [
				// 	...(ws['!merges'] || []),
				// 	{ s: { c: 0, r: acc.length - 1 }, e: { c: 4, r: acc.length - 1 } }, // A{n}:E{n} (вставляем название сервиса в строке {n})
				// ];

				// Добавляем заголовки таблицы для слоев
				// acc.push([
				// 	{ v: 'Название слоя', s: headerStyle },
				// 	{ v: 'Ссылка', s: headerStyle },
				// 	{ v: 'Вчерашняя дата', s: headerStyle },
				// 	{ v: 'Актуальная дата', s: headerStyle },
				// 	{ v: 'Скачать geojson', s: downloadStyle },
				// ]);

				// Добавляем данные для каждого слоя с расхождением в датах
				mismatchedLayers.forEach((layer) => {
					const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
						(yesterdayLayer) => yesterdayLayer.code === layer.code
					);

					// Формируем URL для ссылки
					const geojsonUrl = `http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`;

					acc.push([
						{ v: layer.name || 'Без названия', s: cellStyle }, // Название слоя
						{ v: geojsonUrl, s: cellStyle }, // Код слоя
						{
							v: convertTimestampToDate(yesterdayLayer?.timestamp, layer.type),
							s: cellStyle,
						}, // Вчерашняя дата
						{
							v: convertTimestampToDate(layer.timestamp, layer.type),
							s: cellStyle,
						}, // Актуальная дата
						{ f: `HYPERLINK("${geojsonUrl}", "Скачать")`, s: linkStyle }, // Формируем ссылку для скачивания
					]);
				});

				// Добавляем пустую строку для разделения сервисов, если это не последний сервис
				if (index < arr.length - 1) {
					acc.push([], [], []);
				}

				return acc;
			},
			[]
		);

		// Добавляем данные в лист
		XLSX.utils.sheet_add_aoa(ws, sheetData);

		const rowHeight = 20; // Устанавливаем высоту для каждой строки
		ws['!rows'] = sheetData.map(() => ({ hpx: rowHeight }));

		// Применение стилей к колонкам
		const wsCols = [
			{ wch: 83 }, // Ширина для колонки "Название слоя"
			{ wch: 120 }, // Ширина для колонки "Название кода"
			{ wch: 25 }, // Ширина для колонки "Вчерашняя дата"
			{ wch: 25 }, // Ширина для колонки "Актуальная дата"
			{ wch: 20 }, // Ширина для колонки "Скачать geojson"
		];
		ws['!cols'] = wsCols;

		// Добавляем лист в Workbook
		XLSX.utils.book_append_sheet(wb, ws, 'Filtered Services');

		// Генерация Excel файла и выгрузка
		XLSX.writeFile(wb, 'filtered_services.xlsx');
	}

	// ----------------------------------------------------------------------------
	// ----------------------------------------------------------------------------
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
				{isFiltered && (
					<button
						className="sort-button download"
						onClick={exportToExcel}
					>
						Скачать Excel
					</button>
				)}
				<div className="date-picker-wrapper">
					<input
						id="date-picker"
						type="date"
						value={date}
						min="2024-08-26"
						max={today}
						onChange={handleDate}
					/>
					<div
						onClick={() => document.getElementById('date-picker').showPicker()}
						className="calendar-icon"
					></div>
				</div>

				{progress > 0 && progress < 100 && (
					<div className="loading-indicator">
						<progress
							value={progress}
							max="100"
						/>
						<span>{progress}%</span>
					</div>
				)}
			</div>
			{Object.keys(isFiltered ? filteredMapsData : mapsData).length === 0 ? (
				<p>Нет доступных слоев.</p>
			) : (
				Object.keys(isFiltered ? filteredMapsData : mapsData).map((mapKey) => {
					const serviceName = getServiceName(mapKey, serviceNames);
					const hasMismatch = mapsData[mapKey].some((layer) => {
						const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
							(yesterdayLayer) => yesterdayLayer.code === layer.code
						);
						return checkForMismatch(layer, yesterdayLayer);
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
									hasMismatch ? 'highlight-accordion-item' : ''
								}`}
							>
								<h2>{serviceName}</h2>
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
													<span>{displayText}&nbsp;&nbsp;&nbsp;</span>
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

										return (
											<tbody key={layer.id || `${mapKey}-${layer.code}`}>
												<tr
													className={
														checkForMismatch(layer, yesterdayLayer)
															? 'highlight-row'
															: ''
													}
												>
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
																{/* <a
																	// href={`http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`}
																	className="button"
																>
																	Загрузить в БД
																</a> */}
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
