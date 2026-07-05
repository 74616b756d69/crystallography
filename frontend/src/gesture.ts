// 目玉機能: Web カメラ + 手認識による非接触ナビゲーション。
//
// - 人差し指の先でカーソルを動かす
// - ピンチ（親指と人差し指をつまむ）で決定
// - パー（手を開く）を少し保持で「戻る」
//
// 手認識モデル(@tensorflow-models/hand-pose-detection)は初回だけネットワークから
// 重みを取得する。カメラやモデルが使えない環境では安全に無効化する。

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

export type GestureStatus = 'idle' | 'loading' | 'running' | 'no-camera' | 'error';

export type GestureCallbacks = {
  onPointerMove?: (normalizedX: number, normalizedY: number) => void;
  onSelect?: () => void;
  onBack?: () => void;
  onHandPresence?: (present: boolean) => void;
  onStatus?: (status: GestureStatus, message?: string) => void;
};

type Keypoint = { x: number; y: number; name?: string };

const PINCH_ON = 0.35; // 手のサイズに対する相対しきい値
const PINCH_OFF = 0.5;
const OPEN_PALM_HOLD_MS = 650;
const OPEN_PALM_COOLDOWN_MS = 1200;

export class GestureController {
  private readonly callbacks: GestureCallbacks;
  private readonly video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private detector: handPoseDetection.HandDetector | null = null;
  private running = false;
  private frameId = 0;

  private pinching = false;
  private handWasPresent = false;
  private openPalmSince = 0;
  private lastBackAt = 0;

  constructor(video: HTMLVideoElement, callbacks: GestureCallbacks) {
    this.video = video;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.callbacks.onStatus?.('loading', 'カメラと手認識モデルを準備中…');

    if (!navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onStatus?.('no-camera', 'このブラウザはカメラに対応していません。');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
    } catch {
      this.callbacks.onStatus?.('no-camera', 'カメラの使用が許可されませんでした。');
      return;
    }

    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play().catch(() => undefined);

    try {
      await tf.setBackend('webgl');
      await tf.ready();
      this.detector = await handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, {
        runtime: 'tfjs',
        modelType: 'lite',
        maxHands: 1,
      });
    } catch {
      this.stopStream();
      this.callbacks.onStatus?.('error', '手認識モデルの読み込みに失敗しました（初回はネット接続が必要です）。');
      return;
    }

    this.running = true;
    this.callbacks.onStatus?.('running', '手をかざしてください。');
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.stopStream();
    this.detector?.dispose();
    this.detector = null;
    this.callbacks.onStatus?.('idle');
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  private loop = (): void => {
    if (!this.running || !this.detector) {
      return;
    }
    this.frameId = requestAnimationFrame(this.loop);
    void this.detectOnce();
  };

  private detecting = false;

  private async detectOnce(): Promise<void> {
    if (this.detecting || !this.detector || this.video.readyState < 2) {
      return;
    }
    this.detecting = true;
    try {
      const hands = await this.detector.estimateHands(this.video, { flipHorizontal: true });
      const hand = hands[0];
      const present = Boolean(hand);
      if (present !== this.handWasPresent) {
        this.handWasPresent = present;
        this.callbacks.onHandPresence?.(present);
      }
      if (hand) {
        this.processHand(hand.keypoints as Keypoint[]);
      } else {
        this.pinching = false;
        this.openPalmSince = 0;
      }
    } catch {
      // 単発の推論失敗は無視して次フレームへ。
    } finally {
      this.detecting = false;
    }
  }

  private processHand(keypoints: Keypoint[]): void {
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;

    const wrist = keypoints[0];
    const thumbTip = keypoints[4];
    const indexTip = keypoints[8];
    const indexMcp = keypoints[5];
    const middleMcp = keypoints[9];

    // 手のサイズ（手首〜中指付け根）を基準に距離を正規化する。
    const handSize = distance(wrist, middleMcp) || 1;

    // カーソル位置は人差し指の先。中央を使いやすいよう少し拡張する。
    const nx = clamp01(((indexTip.x / vw) - 0.5) * 1.35 + 0.5);
    const ny = clamp01(((indexTip.y / vh) - 0.5) * 1.35 + 0.5);
    this.callbacks.onPointerMove?.(nx, ny);

    // ピンチ判定（ヒステリシス付き）。
    const pinchDist = distance(thumbTip, indexTip) / handSize;
    if (!this.pinching && pinchDist < PINCH_ON) {
      this.pinching = true;
      this.callbacks.onSelect?.();
    } else if (this.pinching && pinchDist > PINCH_OFF) {
      this.pinching = false;
    }

    // パー（4 指が伸びている）を一定時間保持したら「戻る」。
    if (this.isOpenPalm(keypoints, wrist, indexMcp)) {
      const now = performance.now();
      if (this.openPalmSince === 0) {
        this.openPalmSince = now;
      } else if (now - this.openPalmSince > OPEN_PALM_HOLD_MS && now - this.lastBackAt > OPEN_PALM_COOLDOWN_MS) {
        this.lastBackAt = now;
        this.openPalmSince = 0;
        this.callbacks.onBack?.();
      }
    } else {
      this.openPalmSince = 0;
    }
  }

  // 人差し・中・薬・小指の指先が付け根(MCP)より手首から遠ければ「伸びている」とみなす。
  private isOpenPalm(keypoints: Keypoint[], wrist: Keypoint, indexMcp: Keypoint): boolean {
    const palmSpan = distance(wrist, indexMcp) || 1;
    const fingers: Array<[number, number]> = [
      [8, 5],
      [12, 9],
      [16, 13],
      [20, 17],
    ];
    const extended = fingers.filter(([tip, mcp]) => {
      const tipDist = distance(wrist, keypoints[tip]);
      const mcpDist = distance(wrist, keypoints[mcp]);
      return tipDist - mcpDist > palmSpan * 0.6;
    });
    return extended.length >= 4;
  }
}

function distance(a: Keypoint, b: Keypoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
