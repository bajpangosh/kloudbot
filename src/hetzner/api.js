const axios = require('axios');

function createHetznerApi(project) {
  const token = process.env[`HETZNER_API_TOKEN_${project.toUpperCase()}`];
  if (!token) {
    throw new Error(`API token for project ${project} not found.`);
  }

  return axios.create({
    baseURL: 'https://api.hetzner.cloud/v1',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async function getServerDetails(project) {
  try {
    const hetznerApi = createHetznerApi(project);
    const response = await hetznerApi.get('/servers');
    return response.data.servers;
  } catch (error) {
    throw new Error('Failed to fetch server details: ' + error.message);
  }
}

module.exports = {
  getServerDetails,
};
