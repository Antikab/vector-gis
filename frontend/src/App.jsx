import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [layers, setLayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedServices, setExpandedServices] = useState({});
  const [sortOrders, setSortOrders] = useState({});

  const convertTimestampToDate = (timestamp) => {
    if (!timestamp || timestamp === 0) {
      return 'время - неизвестно';
    }
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  };

  const fetchCache = async () => {
    setLayers([]);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:3007/api/cachedLayers');
      setLayers(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  const fetchData = async () => {
    setLayers([]);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:3007/api/layers');
      setLayers(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (serviceName) => {
    setSortOrders((prevSortOrders) => {
      const currentOrder = prevSortOrders[serviceName] || 'asc';
      const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
      return {
        ...prevSortOrders,
        [serviceName]: newOrder,
      };
    });
  };

  const groupedLayers = useMemo(() => {
    const layersByService = layers.reduce((acc, layer) => {
      if (!acc[layer.nameservice]) {
        acc[layer.nameservice] = [];
      }
      acc[layer.nameservice].push(layer);
      return acc;
    }, {});

    // Сортировка слоев для каждого сервиса
    Object.keys(layersByService).forEach(serviceName => {
      const order = sortOrders[serviceName] || 'asc';
      layersByService[serviceName].sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return order === 'asc'
          ? a.timestamp - b.timestamp
          : b.timestamp - a.timestamp;
      });
    });

    return layersByService;
  }, [layers, sortOrders]);

  const toggleService = (serviceName) => {
    setExpandedServices((prevExpandedServices) => ({
      ...prevExpandedServices,
      [serviceName]: !prevExpandedServices[serviceName],
    }));
  };

  useEffect(() => {
    fetchData();
    fetchCache()
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="App">
      <h1>Информация о слоях</h1>
      <button className="btn" onClick={() => fetchData()}>
        Обновить слои
      </button>
      <button className="btn" onClick={() => fetchCache()}>
        Обновить кэш
      </button>
      {Object.keys(groupedLayers).length === 0 ? (
        <p>No layers available.</p>
      ) : (
        <div className='wrapper'>
          {Object.keys(groupedLayers).map((serviceName) => (
            <div key={serviceName} className="accordion-item">
              <div className="accordion-header" onClick={() => toggleService(serviceName)}>
                <h2>{serviceName}</h2>
              
                  {expandedServices[serviceName] ? '▲' : '▼'}
           
              </div>
              {expandedServices[serviceName] && (
                <table>
                  <thead>
                    <tr>
                      <th>Название кода</th>
                      <th>Название слоя</th>
                      <th className="data-scan" onClick={() => handleSort(serviceName)}>
                        <div className="sort-button">
                          Дата сканирования{' '}
                          <button className={`sort-icon ${sortOrders[serviceName]}`}>
                            {sortOrders[serviceName] === 'asc' ? '↑' : sortOrders[serviceName] === 'desc' ? '↓' : '↕'}
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedLayers[serviceName].map((layer) => (
                      <tr key={layer.id || `${layer.nameservice}-${layer.code}`} className={!layer.timestamp ? 'red' : ''}>
                        <td>{layer.code}</td>
                        <td>{layer.name}</td>
                        <td>{convertTimestampToDate(layer.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
