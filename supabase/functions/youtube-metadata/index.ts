Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { videoId } = await req.json();

  if (!videoId || typeof videoId !== "string") {
    return new Response(JSON.stringify({ error: "videoId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "YouTube API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
  );
  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: "YouTube API error", details: data }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!data.items || data.items.length === 0) {
    return new Response(JSON.stringify({ error: "Video not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const video = data.items[0];
  const metadata = {
    videoId,
    title: video.snippet.title,
    channelTitle: video.snippet.channelTitle,
    description: video.snippet.description,
    duration: video.contentDetails.duration,
    thumbnails: video.snippet.thumbnails,
  };

  return new Response(JSON.stringify(metadata), {
    headers: { "Content-Type": "application/json" },
  });
});
