import json
import logging

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.agents.stt import SpeechStream
from livekit.plugins import deepgram

logger = logging.getLogger("transcription-agent")


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    stt = deepgram.STT(model="nova-2", language="en")

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    audio_track = None
    for _, track_pub in participant.track_publications.items():
        if track_pub.kind == "audio" and track_pub.track:
            audio_track = track_pub.track
            break

    if not audio_track:
        logger.info("Waiting for audio track...")

        @participant.on("track_published")
        def on_track_published(pub):
            nonlocal audio_track
            if pub.kind == "audio":
                audio_track = pub.track

        # Wait for audio track
        while audio_track is None:
            await ctx.sleep(0.1)

    logger.info("Starting transcription stream")
    stream: SpeechStream = stt.stream()

    async for event in stream:
        if event.alternatives:
            best = event.alternatives[0]
            transcript_data = {
                "type": "transcript",
                "text": best.text,
                "is_final": event.is_final,
                "words": [
                    {
                        "word": w.word,
                        "start": w.start_time,
                        "end": w.end_time,
                        "confidence": w.confidence,
                    }
                    for w in (best.words or [])
                ],
            }
            # Send transcript back to all participants via data channel
            await ctx.room.local_participant.publish_data(
                json.dumps(transcript_data).encode(),
                reliable=True,
            )
            logger.debug(f"Transcript: {best.text} (final={event.is_final})")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
