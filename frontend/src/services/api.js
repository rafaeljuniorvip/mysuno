import axios from 'axios';

const baseURL = import.meta.env.PROD
  ? 'https://api.mysn.vipte.co/api'
  : '/api';

const api = axios.create({ baseURL });

export default api;
