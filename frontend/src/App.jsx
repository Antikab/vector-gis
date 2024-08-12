import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // Состояние для направления сортировки

  // Функция преобразования таймстампа в дату
  const convertTimestampToDate = (timestamp) => {
    if (!timestamp || timestamp === 0) {
      return 'время - неизвестно';
    }
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  };

  const fetchData = async () => {
    setLayers([]);
    try {
      const response = await axios.get(
        'http://localhost:3007/api/layers'
        // 'http://glavapu-services:3007/api/layers-vector'
      );
      setLayers(response.data);
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSort = () => {
    let newSortOrder;
    if (sortOrder === 'asc') {
      newSortOrder = 'desc';
    } else {
      newSortOrder = 'asc';
    }

    const sortedLayers = [...layers].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return newSortOrder === 'asc'
        ? a.timestamp - b.timestamp
        : b.timestamp - a.timestamp;
    });

    setLayers(sortedLayers);
    setSortOrder(newSortOrder);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="App">
      <h1>Информация о слоях</h1>
      <button className="btn" onClick={() => fetchData()}>
        Обновить
      </button>
      {layers.length === 0 ? (
        <p>No layers available.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Название сервиса</th>
              <th>Название кода</th>
              <th>Название слоя</th>
              <th className='data-scan' onClick={handleSort}>
                <div className="sort-button">
                  Дата сканирования{' '}
                  <button className={`sort-icon ${sortOrder}`}>
                    {sortOrder === 'asc'
                      ? '↑'
                      : sortOrder === 'desc'
                      ? '↓'
                      : '↕'}
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {layers.map(layer => (
              <tr
                key={layer.id || `${layer.nameservice}-${layer.code}`}
                className={!layer.timestamp ? 'red' : ''}
              >
                <td>{layer.nameservice}</td>
                <td>{layer.code}</td>
                <td>{layer.name}</td>
                <td>{convertTimestampToDate(layer.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
