	// Функция для извлечения номера из `mapKey`
  export const extractServiceNumber = (mapKey) => {
	const match = mapKey.match(/\d+/);
	return match ? parseInt(match[0], 10) : null;
};

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

export const checkForMismatch = (layer, yesterdayLayer) => {
	return (
		yesterdayLayer?.timestamp &&
		layer.timestamp &&
		yesterdayLayer.timestamp !== layer.timestamp
	);
};

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
