import { config } from 'dotenv';
config({ path: '.env.local' });

async function debug() {
  const handle = 'saddlebackchurch';
  const url = `https://www.googleapis.com/youtube/v3/channels?forHandle=${handle}&part=id&key=${process.env.YOUTUBE_API_KEY}`;

  console.log('Testing URL:', url.replace(process.env.YOUTUBE_API_KEY!, 'API_KEY'));

  const res = await fetch(url);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

debug().catch(console.error);
