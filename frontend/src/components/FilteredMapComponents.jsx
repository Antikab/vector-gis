import { useState } from 'react';
import serviceNamesOurs from './serviceNamesOurs';
import {
	extractServiceNumber,
	getServiceName,
	checkForMismatch,
	convertTimestampToDate,
} from './utils';

const FilteredMapComponents = ({
	mapsData,
	yesterdayMapsData,
	isFiltered,
	setIsFiltered,
}) => {
	// Функция для фильтрации по serviceNamesOurs
	const filterOursLayers = (mapsData, serviceNamesOurs) => {
		return Object.keys(mapsData).filter((mapKey) => {
			const serviceNumber = extractServiceNumber(mapKey);
			return serviceNumber && serviceNamesOurs.hasOwnProperty(serviceNumber);
		});
	};

	// Функция для обработки клика по кнопке фильтрации
	const handleFilterToggle = () => {
		setIsFiltered(!isFiltered);
	};

	// Определяем, какие ключи использовать для отображения
	const filteredKeys = isFiltered
		? filterOursLayers(mapsData, serviceNamesOurs)
		: Object.keys(mapsData);

	return (
		<div>
			<button onClick={handleFilterToggle}>
				{isFiltered ? 'Показать все' : 'Фильтровать по сервисам'}
			</button>
			{filteredKeys.map((mapKey) => {
				const serviceName = getServiceName(mapKey, serviceNamesOurs);
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
												{hasValidTimestamp && mapsData[mapKey]?.length > 2 && (
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
												<td className={layer.type === 'folder' ? 'folder' : ''}>
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
													{convertTimestampToDate(layer.timestamp, layer.type)}
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
			})}
		</div>
	);
};

export default FilteredMapComponents;
