import axios from 'axios';

let timeOffset = 0;

export const syncTimeWithServer = async () => {
  try {
    const start = Date.now();
    const response = await axios.get('http://YOUR_BACKEND_IP:3000/api/server-time');
    const end = Date.now();
    
    // محاسبه زمان رفت و برگشت (Latency) برای دقت بیشتر
    const latency = (end - start) / 2;
    const serverTime = response.data.serverTime + latency;
    
    timeOffset = serverTime - Date.now();
    console.log('Time synced. Offset:', timeOffset);
  } catch (error) {
    console.error('Time sync failed, using local time');
  }
};

export const getAdjustedTime = () => Date.now() + timeOffset;