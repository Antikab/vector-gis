import axios from 'axios';
import { useState } from 'react';

function DownloadButton({ url, fileName }) {
	const [isDownloading, setIsDownloading] = useState(false);

	const downloadFile = async () => {
		setIsDownloading(true);

		try {
			const response = await axios.get(url, {
				responseType: 'blob', // Получаем данные в виде Blob
			});

			// Создаем URL для Blob
			const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

			// Создаем временную ссылку для скачивания файла
			const link = document.createElement('a');
			link.href = blobUrl;
			link.setAttribute('download', fileName);
			document.body.appendChild(link);
			link.click();

			// Чистим URL и ссылку
			link.remove();
			window.URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error('Ошибка загрузки файла:', error);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<button
			className="button"
			onClick={downloadFile}
			disabled={isDownloading}
		>
			{isDownloading ? (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
				>
					<g fill="none">
						<path d="M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z" />
						<path
							fill="currentColor"
							d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 2.757a1 1 0 0 1 .993.884l.007.116v6.076l1.828-1.828a1 1 0 0 1 1.498 1.32l-.084.094-3.535 3.535a1 1 0 0 1-1.32.083l-.094-.083-3.536-3.535a1 1 0 0 1 1.32-1.498l.094.084 1.83 1.828V7.757a1 1 0 0 1 1-1Z"
						/>
					</g>
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
				>
					<g
						fill="none"
						fillRule="evenodd"
					>
						<path d="M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z" />
						<path
							fill="currentColor"
							d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm4.242 10.005a1 1 0 0 0-1.414 0L13 13.833V7.757a1 1 0 1 0-2 0v6.076l-1.829-1.828a1 1 0 0 0-1.414 1.414l3.536 3.535a1 1 0 0 0 1.414 0l3.535-3.535a1 1 0 0 0 0-1.415Z"
						/>
					</g>
				</svg>
			)}
		</button>
	);
}

export default DownloadButton;
