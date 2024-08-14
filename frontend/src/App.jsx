import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [mapsData, setMapsData] = useState({});
  const [yesterdayMapsData, setYesterdayMapsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrders, setSortOrders] = useState({});

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
      const response = await axios.request(fetchDataConfig);
      setMapsData(response.data);
      setLoading(false);
    } catch (error) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  const fetchDataYesterday = async () => {
    try {
      const response = await axios.request(fetchYesterdayDataConfig);
      setYesterdayMapsData(response.data);
      setLoading(false);
    } catch (error) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  const convertTimestampToDate = timestamp => {
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

  const handleSort = mapKey => {
    const currentOrder = sortOrders[mapKey] || 'asc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';

    const sortedLayers = [...mapsData[mapKey]].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return newOrder === 'asc'
        ? a.timestamp - b.timestamp
        : b.timestamp - a.timestamp;
    });

    setSortOrders(prevSortOrders => ({
      ...prevSortOrders,
      [mapKey]: newOrder,
    }));

    setMapsData(prevMapsData => ({
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
        Object.keys(mapsData).map(mapKey => {
          const hasValidTimestamp = mapsData[mapKey].some(
            layer => layer.timestamp
          );

          return (
            <details key={mapKey} className="accordion-item">
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
                      <th>Дата кэша (сегодня)</th>
                      <th>Дата кэша (вчера)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapsData[mapKey].map(layer => {
                      const yesterdayLayer = yesterdayMapsData[mapKey]?.find(
                        yesterdayLayer => yesterdayLayer.code === layer.code
                      );

                      return (
                        <tr key={layer.id || `${mapKey}-${layer.code}`}>
                          <td>{layer.name || 'Без названия'}</td>
                          <td className={layer.type === 'folder' ? 'folder' : ''}>
                            {layer.code}
                          </td>
                          <td className={!layer.timestamp ? 'red' : ''}>
                            {convertTimestampToDate(layer.timestamp)}
                          </td>
                          <td className={!yesterdayLayer?.timestamp ? 'red' : ''}>
                            {convertTimestampToDate(yesterdayLayer?.timestamp)}
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
