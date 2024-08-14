import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [mapsData, setMapsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrders, setSortOrders] = useState({});

  // Конфигурация запроса
  const fetchDataConfig = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://glavapu-services:3009/todayCache',
    headers: {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Выполнение запроса с использованием конфигурации
      const response = await axios.request(fetchDataConfig);
      // Устанавливаем данные из ответа
      setMapsData(response.data);
      setLoading(false);
    } catch (error) {
      setError('Ошибка загрузки данных');
      setLoading(false);
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

  const handleSort = (mapKey) => {
    const currentOrder = sortOrders[mapKey] || 'asc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

    const sortedLayers = [...mapsData[mapKey]].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return newOrder === 'asc'
        ? a.timestamp - b.timestamp
        : b.timestamp - a.timestamp;
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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="App">
      <h1>Информация о слоях по картам</h1>
        {Object.keys(mapsData).length === 0 ? (
        <p>No layers available.</p>
      ) : (
        Object.keys(mapsData).map((mapKey) => (
          <div key={mapKey} className="map-section">
            <h2>{mapKey}</h2>
            <table>
              <thead>
                <tr>
                  <th>Название слоя</th>
                  <th>Название кода</th>
                  <th className="data-scan" onClick={() => handleSort(mapKey)}>
                    <div className="sort-button">
                      Дата кэша{' '}
                      <button className={`sort-icon ${sortOrders[mapKey]}`}>
                        {sortOrders[mapKey] === 'asc'
                          ? '↑'
                          : sortOrders[mapKey] === 'desc'
                          ? '↓'
                          : '↕'}
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {mapsData[mapKey].map((layer) => (
                  <tr key={layer.id || `${mapKey}-${layer.code}`} className={!layer.timestamp ? 'red' : ''}>
                    <td>{layer.name || 'Без названия'}</td>
                    <td>{layer.code}</td>
                    <td>{convertTimestampToDate(layer.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
