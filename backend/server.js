import express from 'express';
import cors from 'cors';
import axios from 'axios';
// import { data as apiData } from './data/data.js';
import { data as apiData } from './data/f_data.js';
import axiosRetry from 'axios-retry';


axiosRetry(axios, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
});

const app = express();
const port = 3007;

let cache = {}; // Объект для хранения кеша по датам
let token = '';
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

app.use(cors());
app.use(express.json());

app.get('/api/getToken', (req, res) => {
  let config = {
    method: 'post',
    url: 'http://vector.mka.mos.ru/api/2.8/orbis/login/?user=apu_user2&pass=U9xdFdY6',
  };

  axios
    .request(config)
    .then(response => {
      console.log(JSON.stringify(response.data));
      token = response.data.token;
      res.json(token);
    })
    .catch(error => {
      console.log(error);
    });
});

app.get('/api/layers', async (req, res) => {
  const currentDate = new Date().toLocaleDateString('ru-RU', options);

  // Если на сегодня уже есть данные в кеше, возвращаем их
  if (cache[currentDate]) {
    return res.json(cache[currentDate]);
  }

  let data = [...apiData];

  try {
    const results = await Promise.all(
      data.map(async item => {
        const url = `http://vector.mka.mos.ru/api/2.8/orbis/${item.nameservice}/layers/${item.code}/?with_timestamp=1`;

        try {
          const response = await axios.get(url);
          if (response.data?.timestamp) {
            return {
              ...item,
              id: response.data.id,
              timestamp: response.data.timestamp,
            };
          } else {
            console.error(
              `В ответе по ${item.nameservice}/${item.code} не найден "timestamp"`
            );
            return null;
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.warn(
              `Ресурс не найден для ${item.nameservice}/${item.code}: ${err.message}`
            );
            return {
              ...item,
              timestamp: false,
            };
          } else {
            console.error(
              `Ошибка при запросе данных для ${item.nameservice}/${item.code}: ${err}`
            );
            return null;
          }
        }
      })
    );

    const filteredResults = results.filter(result => result !== null);
    
    // Сохраняем результаты в кеше для текущей даты
    cache[currentDate] = filteredResults;
    console.log(`Данные сохранены в кэш для даты: ${currentDate}`);

    res.json(filteredResults);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Не удалось получить данные' });
  }
});

app.get('/api/cachedLayers', (req, res) => {
  const currentDate = new Date().toLocaleDateString('ru-RU', options);
  res.json(cache[currentDate] || []);
});

app.get('/api/cacheDate', (req, res) => {
  const currentDate = new Date().toLocaleDateString('ru-RU', options);
  res.json({ [currentDate]: cache[currentDate] });
});

app.get('/api/allCache', (req, res) => {
  res.json(cache);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('ошибка 500');
});

app.listen(port, () => {
  console.log(`Server is running on localhost:${port}/api/layers`);
});
