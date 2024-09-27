// Функция для извлечения номера из `mapKey`
// Используется для извлечения числового значения из ключа карты (например, "map123"),
// чтобы сопоставить его с номерами сервисов или сортировать ключи по номеру.
export const extractServiceNumber = (mapKey) => {
	const match = mapKey.match(/\d+/);
	return match ? parseInt(match[0], 10) : null;
};

// Функция для получения полного имени сервиса
// Формирует полное имя сервиса на основе ключа карты (`mapKey`) и списка имен сервисов.
// Если ключ карты содержит номер (например, "map123"), извлекается номер и находится соответствующее имя.
// Также возвращает форматированное имя с учетом чистого ключа или добавляет описание для сервиса.
export const getServiceName = (mapKey, serviceNames) => {
	const cleanedMapKey = mapKey.replace('map', '');
	const serviceNumber = extractServiceNumber(mapKey);
	const serviceName = serviceNames[serviceNumber];

	return mapKey !== cleanedMapKey
		? `Сервис ${cleanedMapKey}${
				serviceNames[cleanedMapKey] ? ` - ${serviceNames[cleanedMapKey]}` : ''
		  }`
		: serviceName
		? `${serviceNumber} - ${serviceName}`
		: '';
};

// Функция для сортировки ключей
// Сортирует массив ключей карт по их числовому значению, извлеченному через `extractServiceNumber`.
// Если ключи содержат числа, они сортируются по возрастанию. Если числа нет, ключи сортируются по алфавиту.
export const sortKeys = (keys, extractServiceNumber) => {
	return keys.sort((a, b) => {
		const aNumber = extractServiceNumber(a);
		const bNumber = extractServiceNumber(b);

		if (aNumber !== null && bNumber !== null) {
			return aNumber - bNumber;
		} else if (aNumber !== null) {
			return -1;
		} else if (bNumber !== null) {
			return 1;
		} else {
			return a.localeCompare(b);
		}
	});
};

// Функция для проверки расхождений между слоями
// Сравнивает два слоя (текущий и вчерашний) по их timestamp. Возвращает true, если временные метки отличаются,
// что указывает на наличие расхождений между слоями (например, обновленные данные).
export const checkForMismatch = (layer, yesterdayLayer) => {
	return (
		yesterdayLayer?.timestamp &&
		layer.timestamp &&
		yesterdayLayer.timestamp !== layer.timestamp
	);
};

// Функция для фильтрации слоев с расхождениями
// Принимает массив слоев и вчерашние слои, фильтрует слои, у которых есть расхождения по временным меткам.
export const filterLayersWithMismatch = (layers, yesterdayLayers) => {
	return layers.filter((layer) => {
		const yesterdayLayer = yesterdayLayers?.find(
			(yesterdayLayer) => yesterdayLayer.code === layer.code
		);
		return checkForMismatch(layer, yesterdayLayer);
	});
};

// Функция для фильтрации данных карт с учетом расхождений
// Принимает данные карт и данные за вчера, фильтрует слои с расхождениями и возвращает новый объект с отфильтрованными данными.
export const filterMapsDataByMismatch = (data, yesterdayData) => {
	return Object.keys(data).reduce((acc, mapKey) => {
		const layers = data[mapKey] || [];
		const yesterdayLayers = yesterdayData[mapKey] || [];
		const matchingLayers = filterLayersWithMismatch(layers, yesterdayLayers);

		if (matchingLayers.length > 0) {
			acc[mapKey] = matchingLayers;
		}

		return acc;
	}, {});
};

// Функция для фильтрации слоев по ссылкам
// Принимает массив слоев, ссылки и ключ карты, фильтрует слои по их соответствию с переданными ссылками.
export const filterLayersByLinks = (layers, links, mapKey) => {
	return layers.filter((layer) => {
		const geojsonUrl = `http://vector.mka.mos.ru/api/2.8/orbis/${mapKey}/layers/${layer.code}/export/?format=geojson&mka_srs=1`;
		return links.includes(geojsonUrl);
	});
};

// Функция для конвертации timestamp в формат даты
// Преобразует timestamp (в секундах) в строку с датой и временем в формате `ru-RU` (дд.мм.гггг чч:мм:сс).
// Если `type` равен 'folder', функция вернет `null`. Если timestamp отсутствует или равен 0, возвращает строку 'время неизвестно'.
export const convertTimestampToDate = (timestamp, type) => {
	if (type === 'folder') {
		return null;
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
