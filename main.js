// main.js (ES Module)
import { Device } from 'https://esm.sh/mediasoup-client@3?bundle';
import mySignaling from './my-signaling.js'; // Our own signaling stuff.

let device;

// Device 초기화 (공통)
async function initDevice() {
  if (device) return device;

  device = new Device();
  const routerRtpCapabilities = await mySignaling.request('getRtpCapabilities');
  await device.load({ routerRtpCapabilities });
  return device;
}

// 1. 보내는 쪽 (Producer)
async function startMedia() {
  try {
    await initDevice();

    if (!device.canProduce('audio')) {
      console.warn('cannot produce audio');
      return;
    }

    // Send Transport 생성
    const transportInfo = await mySignaling.request('createSendTransport', {
      sctpCapabilities: device.sctpCapabilities,
    });

    const sendTransport = device.createSendTransport(transportInfo);

    sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await mySignaling.request('connectTransport', {
          transportId: sendTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { id } = await mySignaling.request('produce', {
          transportId: sendTransport.id,
          kind,
          rtpParameters,
          appData,
        });
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });

    // 마이크 오디오 전송
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioTrack = stream.getAudioTracks()[0];
    const audioProducer = await sendTransport.produce({ track: audioTrack });

    console.log('Audio Producer created:', audioProducer);

  } catch (err) {
    console.error(err);
  }
}

// 2. 받는 쪽 (Consumer)
async function consumeAudio() {
  try {
    await initDevice();

    // Recv Transport 생성
    const transportInfo = await mySignaling.request('createRecvTransport', {
      sctpCapabilities: device.sctpCapabilities,
    });

    const recvTransport = device.createRecvTransport(transportInfo);

    recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await mySignaling.request('connectTransport', {
          transportId: recvTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    // 서버에 있는 Producer ID 가져오기 (간단한 테스트용)
    const { producerId } = await mySignaling.request('getProducerId');
    if (!producerId) {
      alert('No producer found. Please start media in another tab first.');
      return;
    }

    // Consume 요청
    const { rtpParameters, id } = await mySignaling.request('consume', {
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    const consumer = await recvTransport.consume({
      id,
      producerId,
      kind: 'audio',
      rtpParameters,
    });

    console.log('Consumer created:', consumer);

    // 오디오 재생
    const { track } = consumer;
    const stream = new MediaStream([track]);

    // 화면에 오디오 컨트롤 표시 (디버깅용)
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.srcObject = stream;
    document.body.appendChild(audio);

    await audio.play();

  } catch (err) {
    console.error(err);
  }
}

document.getElementById('start').addEventListener('click', startMedia);
document.getElementById('consume').addEventListener('click', consumeAudio);