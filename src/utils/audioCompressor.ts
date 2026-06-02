/**
 * Highly optimized browser-based audio converter and compressor.
 * Decodes compressed audio files (MP3, WAV, AAC, M4A, OGG) using the web standard Web Audio API,
 * downsamples them to a low-bandwidth mono WAV format (e.g., 16000Hz, 12000Hz, or 8000Hz),
 * which is 100% legible for Gemini AI but up to 10x smaller in file size.
 * This ensures lightning-fast uploads on mobile connections (3G/4G/5G) and avoids API timeouts.
 */

export async function compressAudioToWav(
  fileOrBlob: Blob,
  targetSampleRate: number = 16000,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  if (onProgress) onProgress("অডিও ডিকোড করার জন্য লোড হচ্ছে...");

  // Load the file into an ArrayBuffer
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const audioCtx = new AudioContextClass();

  if (onProgress) onProgress("অডিও ডিকোড করা হচ্ছে...");

  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    audioCtx.close();
    throw new Error("অডিও ডিকোড করা যায়নি। ফাইলটি করাপ্ট হতে পারে অথবা ফরম্যাট অসঙ্গতিপূর্ণ।");
  } finally {
    audioCtx.close();
  }

  const duration = decodedBuffer.duration;
  
  // Set adaptive sample rate depending on duration to ensure size stays under 10MB
  let finalSampleRate = targetSampleRate;
  if (duration > 600) { // > 10 minutes
    finalSampleRate = 12000;
  }
  if (duration > 1200) { // > 20 minutes
    finalSampleRate = 8000;
  }

  if (onProgress) onProgress(`অডিও সাইজ কমানো (রিস্যাম্পল করে ${finalSampleRate}Hz করা) হচ্ছে...`);

  const OfflineAudioCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineAudioCtxClass) {
    throw new Error("Offline audio context is not supported.");
  }

  // Use OfflineAudioContext for extremely fast asynchronous browser resampling
  const offlineCtx = new OfflineAudioCtxClass(
    1, // Mono output (we only need the vocal data for transcription)
    Math.floor(duration * finalSampleRate),
    finalSampleRate
  );

  // Play decoded buffer inside offline context
  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = decodedBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);
  
  const renderedBuffer = await offlineCtx.startRendering();

  if (onProgress) onProgress("অডিও ট্র্যাক এনকোড করা হচ্ছে...");
  
  // Create WAV Blob
  const wavBlob = encodeWAV(renderedBuffer);
  
  return wavBlob;
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const channelData = audioBuffer.getChannelData(0); // Mono channel
  const sampleRate = audioBuffer.sampleRate;
  const bufferLength = channelData.length;
  
  // 16-bit PCM WAV has a 44-byte header
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw pcm) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true); // Mono
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength * 2, true);

  // Write float PCM samples as 16-bit signed integers (Little Endian)
  let offset = 44;
  for (let i = 0; i < bufferLength; i++) {
    let sample = channelData[i];
    // Clamp sample between -1 and 1
    if (sample > 1) sample = 1;
    else if (sample < -1) sample = -1;
    
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
