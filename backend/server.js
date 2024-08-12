import express from 'express';
import cors from 'cors';
import axios from 'axios';
// import { data as apiData } from './data/data.js';
import { data as apiData } from './data/f_data.js';
import axiosRetry from 'axios-retry';
import dotenv from 'dotenv';

// Инициализация переменных окружения
dotenv.config();

axiosRetry(axios, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
});

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/api/layers', async (req, res) => {
// app.get('/api/layers-vector', async (req, res) => {
  let data = [...apiData];

  try {
    const results = await Promise.all(
      data.map(async item => {
        const url = ` http://vector.mka.mos.ru/api/2.8/orbis/${item.nameservice}/layers/${item.code}/?with_timestamp=1`;

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
              `     В ответе по ${item.nameservice}/${item.code} не найден "timestamp"`
            );
            return null;
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            console.warn(
              `   Ресурс не найден для ${item.nameservice}/${item.code}: ${err.message}`
            );
            return {
              ...item,
              timestamp: false,
            };
          } else {
            console.error(
              `Ошибка при запросе данных для ${item.nameservice}/${item.code}:,
              err`
            );
            return null;
          }
        }
      })
    );

    const filteredResults = results.filter(result => result !== null);

    res.json(filteredResults);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Не удалось получить данные' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('что-то сломалось!');
});

app.listen(port, () => {
  console.log(
    `Server is running on ${process.env.REACT_APP_API_BASE_URL}:${port}/api/layers`
  );
});
