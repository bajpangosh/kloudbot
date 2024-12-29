const axios = require('axios');

const hetznerApi = axios.create({
  baseURL: 'https://api.hetzner.cloud/v1',
  headers: {
    'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN}`,
  },
});

async function getServerDetails() {
  try {
    const response = await hetznerApi.get('/servers');
    return response.data.servers;
  } catch (error) {
    throw new Error('Failed to fetch server details: ' + error.message);
  }
}

module.exports = {
  getServerDetails,
};
