import { Innertube } from "youtubei.js";

async function test() {
  try {
    console.log("Initializing Innertube...");
    const youtube = await Innertube.create();

    console.log("Getting video info for S82EJ14zlMc...");
    const info = await youtube.getInfo("S82EJ14zlMc");

    console.log("Getting transcript...");
    const transcript = await info.getTranscript();

    if (transcript?.transcript?.content) {
      const body = transcript.transcript.content.body;
      if (body?.initial_segments) {
        console.log("Got", body.initial_segments.length, "segments");
        console.log(
          "First 3:",
          body.initial_segments.slice(0, 3).map((s) => ({
            start_ms: s.start_ms,
            end_ms: s.end_ms,
            text: s.snippet?.text || s.snippet?.runs?.map((r) => r.text).join(""),
          }))
        );
      } else {
        console.log("No segments in body");
        console.log("Body:", JSON.stringify(body, null, 2).slice(0, 500));
      }
    } else {
      console.log("No transcript found");
      console.log("Transcript object:", transcript);
    }
  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
  }
}

test();
