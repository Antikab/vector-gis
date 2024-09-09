import axios from 'axios';
import { useState, useEffect } from 'react';
import './App.css';
import * as XLSX from 'xlsx-js-style';
// import { testData, testYesterdayData } from './components/testData';
import serviceNames from './components/serviceNames';
import serviceNamesOurs from './components/serviceNamesOurs';
import DownloadButton from './components/DownloadButton';
import {
	extractServiceNumber,
	getServiceName,
	checkForMismatch,
	convertTimestampToDate,
	sortKeys,
} from './components/utils';
import links from './components/links';

function App() {
	const [mapsData, setMapsData] = useState({});
	const [originalMapsData, setOriginalMapsData] = useState({});
	const [yesterdayMapsData, setYesterdayMapsData] = useState({});
	const [sortOrders, setSortOrders] = useState({});
	const [error, setError] = useState(null);
	const [progress, setProgress] = useState(0);
	const [filteredMapsData, setFilteredMapsData] = useState({});
	const [isFiltered, setIsFiltered] = useState(false);
	const [isFilteredOurs, setIsFilteredOurs] = useState(false);
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

			// Сохраняем исходные данные в новое состояние
			setOriginalMapsData(sortedData);
			setMapsData(sortedData); // также обновляем текущее состояние
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
		// Определяем следующий порядок сортировки
		const nextOrder =
			sortOrders[mapKey] === 'asc'
				? 'desc'
				: sortOrders[mapKey] === 'desc'
				? 'none'
				: 'asc';

		// Если порядок "none", сбрасываем данные на оригинальные
		if (nextOrder === 'none') {
			if (isFiltered) {
				setFilteredMapsData((prev) => ({
					...prev,
					[mapKey]: [...originalMapsData[mapKey]],
				}));
			} else {
				setMapsData((prev) => ({
					...prev,
					[mapKey]: [...originalMapsData[mapKey]],
				}));
			}
			// Обновляем состояние сортировки
			setSortOrders((prev) => ({ ...prev, [mapKey]: nextOrder }));
			return;
		}

		// Определяем, по какому значению сортировать (сегодня или вчера)
		const getTimestamp = (layer) => {
			if (sortBy === 'today') return layer.timestamp;
			const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
				(l) => l.code === layer.code
			);
			return yesterdayLayer?.timestamp;
		};

		// Используем фильтрованные данные, если фильтр активен, иначе оригинальные
		let layersToSort = isFiltered
			? [...filteredMapsData[mapKey]]
			: [...mapsData[mapKey]];

		// Сортировка, если nextOrder не сброшен
		layersToSort.sort((a, b) => {
			const aTimestamp = getTimestamp(a);
			const bTimestamp = getTimestamp(b);
			if (!aTimestamp) return 1;
			if (!bTimestamp) return -1;
			return nextOrder === 'asc'
				? aTimestamp - bTimestamp
				: bTimestamp - aTimestamp;
		});

		// Обновляем данные после сортировки
		if (isFiltered) {
			setFilteredMapsData((prev) => ({ ...prev, [mapKey]: layersToSort }));
		} else {
			setMapsData((prev) => ({ ...prev, [mapKey]: layersToSort }));
		}

		// Обновляем состояние сортировки
		setSortOrders((prev) => ({ ...prev, [mapKey]: nextOrder }));
	};

	const filterMapsData = () => {
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
		setIsFilteredOurs(false); // Сбрасываем состояние фильтра "наши слои"
	};

	const filterLayersByLinks = (layers, links, mapKey) => {
		return layers.filter((layer) => {
			const geojsonUrl = `http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`;
			return links.includes(geojsonUrl);
		});
	};

	const filterOursMapsData = () => {
		const filteredOursData = Object.keys(mapsData).reduce((acc, mapKey) => {
			const serviceName = getServiceName(mapKey, serviceNames);
			const serviceNameOurs = getServiceName(mapKey, serviceNamesOurs);
			const isOursService = serviceNameOurs.includes(serviceName);

			if (isOursService) {
				// Фильтруем слои по ссылкам
				const layers = mapsData[mapKey] || [];
				const layersInLinks = filterLayersByLinks(layers, links, mapKey);
				// Проверяем на расхождения
				const matchingLayers = layersInLinks.filter((layer) => {
					const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
						(yesterdayLayer) => yesterdayLayer.code === layer.code
					);

					return checkForMismatch(layer, yesterdayLayer);
				});

				if (matchingLayers.length > 0) {
					acc[mapKey] = matchingLayers;
				}
			}

			return acc;
		}, {});

		setFilteredMapsData(filteredOursData);
		setIsFiltered(true);
		setIsFilteredOurs(true); // Устанавливаем состояние для фильтра "наши слои"
	};

	function exportToExcel() {
		// Создаем новый Workbook
		const wb = XLSX.utils.book_new();

		// Создаем лист для данных
		const ws = XLSX.utils.aoa_to_sheet([]);

		const linkStyle = {
			font: { color: { rgb: '0000FF' }, underline: true },
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

				// Добавляем данные для каждого слоя с расхождением в датах
				mismatchedLayers.forEach((layer) => {
					const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
						(yesterdayLayer) => yesterdayLayer.code === layer.code
					);

					// Формируем URL для ссылки
					const geojsonUrl = `http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`;

					acc.push([
						{ v: layer.name || 'Без названия' }, // Название слоя
						{ v: geojsonUrl }, // Код слоя
						{
							v: convertTimestampToDate(yesterdayLayer?.timestamp, layer.type),
						}, // Вчерашняя дата
						{
							v: convertTimestampToDate(layer.timestamp, layer.type),
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
					onClick={isFiltered ? () => setIsFiltered(false) : filterMapsData}
				>
					{isFiltered ? 'Показать все слои' : 'Показать измененные слои'}
				</button>

				{!isFiltered && (
					<button
						className="sort-button ours"
						onClick={filterOursMapsData}
					>
						Измененные наши слои
					</button>
				)}

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
					const hasMismatch = (isFiltered ? filteredMapsData : mapsData)[
						mapKey
					].some((layer) => {
						const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
							(yesterdayLayer) => yesterdayLayer.code === layer.code
						);
						return checkForMismatch(layer, yesterdayLayer);
					});

					const hasValidTimestamp = (isFiltered ? filteredMapsData : mapsData)[
						mapKey
					].some((layer) => layer.timestamp);

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
													{!isFilteredOurs &&
														hasValidTimestamp &&
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
													{!isFilteredOurs &&
														hasValidTimestamp &&
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

									{(isFiltered ? filteredMapsData : mapsData)[mapKey].map(
										(layer) => {
											const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
												(yesterdayLayer) => yesterdayLayer.code === layer.code
											);
											const downloadUrl = `http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`;

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
															className={
																layer.type === 'folder' ? 'folder' : ''
															}
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
																<a
																	// href={`http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`}
																	className="button"
																>
																	Загрузить в БД
																</a> */}
																	<DownloadButton
																		url={downloadUrl}
																		fileName={`${
																			layer.name || 'download'
																		}.geojson`}
																	/>
																</div>
															)}
														</td>
													</tr>
												</tbody>
											);
										}
									)}
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
