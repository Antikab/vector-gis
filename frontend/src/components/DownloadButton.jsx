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
    console.error('Error downloading the file:', error);
    alert('Ошибка при скачивании файла. Пожалуйста, попробуйте еще раз.');
  } finally {
    setIsDownloading(false);
  }
};


	return (
		<div>
			<button
      className='button'
				onClick={downloadFile}
				disabled={isDownloading}
			>
				{isDownloading ? 'Загрузка...' : 'Скачать файл'}
			</button>
		</div>
	);
}

export default DownloadButton;
