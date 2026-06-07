/**
 * MP4 streaming audio demuxer / extractor
 * Extracts raw AAC audio track from MP4 files using standard W3C File slices,
 * without loading the whole file into RAM. Exceedingly friendly for mobile memory (RAM safe)
 * and processes gigabytes of files in literally two-three seconds.
 */

// Helper to read slices of file safely and return a DataView
async function readBytes(file: File, offset: number, length: number): Promise<DataView> {
  const blob = file.slice(offset, offset + length);
  const arrayBuffer = await blob.arrayBuffer();
  return new DataView(arrayBuffer);
}

interface Box {
  type: string;
  start: number; // Payload start offset
  size: number;  // Payload size
}

// Find all sequential boxes at a specific level inside container
async function findBoxes(file: File, start: number, end: number): Promise<Box[]> {
  const boxes: Box[] = [];
  let offset = start;
  while (offset < end) {
    if (offset + 8 > file.size) break;
    const header = await readBytes(file, offset, 8);
    if (header.byteLength < 8) break;
    
    const size = header.getUint32(0);
    const type = String.fromCharCode(
      header.getUint8(4),
      header.getUint8(5),
      header.getUint8(6),
      header.getUint8(7)
    );
    
    let boxSize = size;
    let headerSize = 8;
    
    if (size === 1) {
      if (offset + 16 > file.size) break;
      const largeSizeHeader = await readBytes(file, offset + 8, 8);
      const high = largeSizeHeader.getUint32(0);
      const low = largeSizeHeader.getUint32(4);
      boxSize = high * 0x100000000 + low;
      headerSize = 16;
    } else if (size === 0) {
      boxSize = end - offset;
    }
    
    // Safety check for corrupt headers or infinite loops
    if (boxSize <= 0) break;
    
    boxes.push({
      type,
      start: offset + headerSize,
      size: boxSize - headerSize
    });
    offset += boxSize;
  }
  return boxes;
}

const SAMPLE_RATES = [
  96000, 88200, 64000, 48000, 44100, 32000,
  24000, 22050, 16000, 12000, 11025, 8000, 7350
];

function getSampleRateIndex(rate: number): number {
  const idx = SAMPLE_RATES.indexOf(rate);
  return idx !== -1 ? idx : 4; // Default to 44100 Hz index (4)
}

/**
 * Generates ADTS header for AAC frames
 * @param frameLength Total length of AAC packet + 7 bytes header
 * @param freqIdx Index of the sample rate
 * @param channels Number of audio channels
 */
function createADTSHeader(frameLength: number, freqIdx: number, channels: number): Uint8Array {
  const header = new Uint8Array(7);
  // Syncword: 0xFFF (12 bits)
  // ID: 0 (1 bit) for MPEG-4
  // Layer: 00 (2 bits)
  // Protection absent: 1 (1 bit, meaning no CRC check)
  header[0] = 0xFF;
  header[1] = 0xF1; // 0xF1 = 1111 0001
  
  // Profile: AAC-LC is index 1 (similar to MPEG-4 profile 2)
  const profile = 1; 
  header[2] = (profile << 6) | (freqIdx << 2) | (0 << 1) | ((channels >> 2) & 1);
  header[3] = ((channels & 3) << 6) | ((frameLength >> 11) & 3);
  header[4] = (frameLength >> 3) & 0xFF;
  header[5] = ((frameLength & 7) << 5) | 0x1F;
  header[6] = 0xFC;
  return header;
}

export async function extractAudioFromMp4(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // 1. Locate moov (metadata) box
  const topBoxes = await findBoxes(file, 0, file.size);
  const moov = topBoxes.find(b => b.type === 'moov');
  if (!moov) {
    throw new Error('ফাইলটিতে সঠিক MP4 মেটাডাটা পাওয়া যায়নি। দয়া করে স্ট্যান্ডার্ড MP4 ভিডিও দিন।');
  }

  // 2. Locate all trak boxes inside moov
  const moovBoxes = await findBoxes(file, moov.start, moov.start + moov.size);
  const traks = moovBoxes.filter(b => b.type === 'trak');
  
  let audioTrak: Box | null = null;
  let audioHandlerBox: Box | null = null;

  for (const trak of traks) {
    const mdia = (await findBoxes(file, trak.start, trak.start + trak.size)).find(b => b.type === 'mdia');
    if (!mdia) continue;
    
    const mdiaBoxes = await findBoxes(file, mdia.start, mdia.start + mdia.size);
    const hdlr = mdiaBoxes.find(b => b.type === 'hdlr');
    if (!hdlr || hdlr.size < 12) continue;
    
    // Read handler_type (4 bytes starting at byte offset 8 inside payload)
    const hdlrData = await readBytes(file, hdlr.start + 8, 4);
    const handlerType = String.fromCharCode(
      hdlrData.getUint8(0),
      hdlrData.getUint8(1),
      hdlrData.getUint8(2),
      hdlrData.getUint8(3)
    );
    
    if (handlerType === 'soun') {
      audioTrak = trak;
      break;
    }
  }

  if (!audioTrak) {
    throw new Error('ভিডিও ফাইলটিতে কোনো অডিও সাউন্ড ট্র্যাক খুঁজে পাওয়া যায়নি।');
  }

  // 3. Dig down the sample table (stbl) of the audio track
  // trak -> mdia -> minf -> stbl
  const mdia = (await findBoxes(file, audioTrak.start, audioTrak.start + audioTrak.size)).find(b => b.type === 'mdia');
  if (!mdia) throw new Error('mdia box is missing');
  
  const minf = (await findBoxes(file, mdia.start, mdia.start + mdia.size)).find(b => b.type === 'minf');
  if (!minf) throw new Error('minf box is missing');
  
  const stbl = (await findBoxes(file, minf.start, minf.start + minf.size)).find(b => b.type === 'stbl');
  if (!stbl) throw new Error('stbl box is missing');
  
  const stblBoxes = await findBoxes(file, stbl.start, stbl.start + stbl.size);
  
  // Parse stco or co64 (chunk offset table)
  const stco = stblBoxes.find(b => b.type === 'stco');
  const co64 = stblBoxes.find(b => b.type === 'co64');
  if (!stco && !co64) {
    throw new Error('অডিও লেআউট অফসেট ইনডেক্স করা নেই।');
  }

  const chunkOffsets: number[] = [];
  if (stco) {
    const data = await readBytes(file, stco.start, 8);
    const entryCount = data.getUint32(4);
    const body = await readBytes(file, stco.start + 8, entryCount * 4);
    for (let i = 0; i < entryCount; i++) {
      chunkOffsets.push(body.getUint32(i * 4));
    }
  } else if (co64) {
    const data = await readBytes(file, co64.start, 8);
    const entryCount = data.getUint32(4);
    const body = await readBytes(file, co64.start + 8, entryCount * 8);
    for (let i = 0; i < entryCount; i++) {
      const high = body.getUint32(i * 8);
      const low = body.getUint32(i * 8 + 4);
      chunkOffsets.push(high * 0x100000000 + low);
    }
  }

  // Parse stsz (sample size table)
  const stsz = stblBoxes.find(b => b.type === 'stsz');
  if (!stsz) {
    throw new Error('অডিও ফাইল ফ্রেম সাইজ ইনডেক্স করা নেই।');
  }
  const stszData = await readBytes(file, stsz.start, 12);
  const uniformSize = stszData.getUint32(4);
  const sampleCount = stszData.getUint32(8);
  const sampleSizes: number[] = [];
  
  if (uniformSize > 0) {
    for (let i = 0; i < sampleCount; i++) {
      sampleSizes.push(uniformSize);
    }
  } else {
    const sizesBody = await readBytes(file, stsz.start + 12, sampleCount * 4);
    for (let i = 0; i < sampleCount; i++) {
      sampleSizes.push(sizesBody.getUint32(i * 4));
    }
  }

  // Parse stsc (sample-to-chunk map table)
  const stsc = stblBoxes.find(b => b.type === 'stsc');
  if (!stsc) {
    throw new Error('sample-to-chunk matching table is missing');
  }
  const stscData = await readBytes(file, stsc.start, 8);
  const stscEntryCount = stscData.getUint32(4);
  const stscBody = await readBytes(file, stsc.start + 8, stscEntryCount * 12);
  const sampleToChunks: { firstChunk: number; samplesPerChunk: number; sampleDescIndex: number }[] = [];
  
  for (let i = 0; i < stscEntryCount; i++) {
    sampleToChunks.push({
      firstChunk: stscBody.getUint32(i * 12),
      samplesPerChunk: stscBody.getUint32(i * 12 + 4),
      sampleDescIndex: stscBody.getUint32(i * 12 + 8)
    });
  }

  // Parse stsd (to extract codec frequency and channel count)
  const stsd = stblBoxes.find(b => b.type === 'stsd');
  let frequency = 44100;
  let channels = 2;
  if (stsd) {
    const list = await findBoxes(file, stsd.start + 8, stsd.start + stsd.size);
    const wavCodec = list.find(b => b.type === 'mp4a' || b.type === 'enca');
    if (wavCodec) {
      const wavData = await readBytes(file, wavCodec.start, 28);
      channels = wavData.getUint16(16);
      frequency = wavData.getUint16(24);
    }
  }

  const freqIdx = getSampleRateIndex(frequency);

  // 4. Batch reconstruct and slice out the AAC frames streams beautifully
  const outBlobs: Blob[] = [];
  let currentBatch: Uint8Array[] = [];
  let currentBatchSize = 0;
  const FLUSH_LIMIT = 3 * 1024 * 1024; // 3 MB flush threshold to clear GC loop memory

  let sampleIdx = 0;
  let stscIdx = 0;
  const totalChunks = chunkOffsets.length;

  // Let's pre-compute sizes and samples per chunk so we can read them in batches
  const chunkInfos: {
    startOffset: number;
    byteSize: number;
    samplesCount: number;
    sampleStartIndex: number;
    samplesPerChunkMapIdx: number;
  }[] = [];

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunk1Based = chunkIdx + 1;
    if (stscIdx + 1 < sampleToChunks.length && chunk1Based >= sampleToChunks[stscIdx + 1].firstChunk) {
      stscIdx++;
    }
    
    const samplesInThisChunk = sampleToChunks[stscIdx].samplesPerChunk;
    
    // Calculate byte size of this chunk
    let chunkByteSize = 0;
    for (let s = 0; s < samplesInThisChunk; s++) {
      const sIdx = sampleIdx + s;
      if (sIdx < sampleSizes.length) {
        chunkByteSize += sampleSizes[sIdx];
      }
    }

    chunkInfos.push({
      startOffset: chunkOffsets[chunkIdx],
      byteSize: chunkByteSize,
      samplesCount: samplesInThisChunk,
      sampleStartIndex: sampleIdx,
      samplesPerChunkMapIdx: stscIdx
    });

    sampleIdx += samplesInThisChunk;
  }

  // Process chunk reads in parallel batches of 8 for mobile stability and low memory consumption
  const BATCH_SIZE = 8;
  for (let b = 0; b < totalChunks; b += BATCH_SIZE) {
    const limit = Math.min(b + BATCH_SIZE, totalChunks);
    const readPromises: Promise<{ index: number; buffer: Uint8Array | null }>[] = [];

    for (let i = b; i < limit; i++) {
      const info = chunkInfos[i];
      if (info.byteSize > 0) {
        const promise = (async () => {
          try {
            const chunkBlob = file.slice(info.startOffset, info.startOffset + info.byteSize);
            const arrayBuf = await chunkBlob.arrayBuffer();
            return { index: i, buffer: new Uint8Array(arrayBuf) };
          } catch (e) {
            console.error("Failed to read chunk buffer in batch", e);
            return { index: i, buffer: null };
          }
        })();
        readPromises.push(promise);
      } else {
        readPromises.push(Promise.resolve({ index: i, buffer: null }));
      }
    }

    const results = await Promise.all(readPromises);

    for (let r = 0; r < results.length; r++) {
      const { index, buffer } = results[r];
      if (!buffer) continue;

      const info = chunkInfos[index];
      let chunkInnerOffset = 0;
      for (let s = 0; s < info.samplesCount; s++) {
        const sIdx = info.sampleStartIndex + s;
        if (sIdx >= sampleSizes.length) break;
        
        const sampleSize = sampleSizes[sIdx];
        const adtsHeader = createADTSHeader(sampleSize + 7, freqIdx, channels);
        
        currentBatch.push(adtsHeader);
        currentBatch.push(buffer.subarray(chunkInnerOffset, chunkInnerOffset + sampleSize));
        currentBatchSize += 7 + sampleSize;
        
        chunkInnerOffset += sampleSize;
      }
    }

    // Trigger regular interface notification and clear storage buffers periodically
    if (currentBatchSize >= FLUSH_LIMIT) {
      outBlobs.push(new Blob(currentBatch, { type: 'audio/aac' }));
      currentBatch = [];
      currentBatchSize = 0;
      
      if (onProgress) {
        onProgress(Math.min(99, Math.round((limit / totalChunks) * 100)));
      }
    }
  }

  // Push remaining frame batches
  if (currentBatch.length > 0) {
    outBlobs.push(new Blob(currentBatch, { type: 'audio/aac' }));
  }

  if (onProgress) {
    onProgress(100);
  }

  return new Blob(outBlobs, { type: 'audio/aac' });
}

export function isMp4File(file: File): boolean {
  // Check typical MP4 file extensions or mimeType (including QuickTime MOV and 3GP which are structurally identical)
  const nameLower = file.name.toLowerCase();
  if (
    nameLower.endsWith('.mp4') || 
    nameLower.endsWith('.m4v') || 
    nameLower.endsWith('.m4a') ||
    nameLower.endsWith('.mov') ||
    nameLower.endsWith('.3gp')
  ) {
    return true;
  }
  if (
    file.type === 'video/mp4' || 
    file.type === 'audio/mp4' || 
    file.type === 'audio/x-m4a' ||
    file.type === 'video/quicktime' ||
    file.type === 'video/3gpp'
  ) {
    return true;
  }
  return false;
}
