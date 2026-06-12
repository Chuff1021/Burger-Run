import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { boss } from '../../game/bossSim';

/** What the driver wants the rig to do this frame. */
export interface RigIntent {
  clip: string;
  /** restart key — bump to replay the same one-shot (e.g. combo step index) */
  nonce?: number;
  loop?: boolean;
  speed?: number;
  /** freeze the pose (hitstun, knockdown — procedural juice takes over) */
  paused?: boolean;
  /** head-turn toward the opponent, -1..1 */
  face?: number;
  /** impulse 0..1 — whiplash recoil through spine and head */
  recoil?: number;
}

interface FighterRigProps {
  rigUrl: string;
  /** clip key → animation-only GLB url (mesh-stripped, retargets by node name) */
  clips: Record<string, string>;
  height: number;
  driver: () => RigIntent;
}

/**
 * Skinned Meshy character with a real animation system: one compressed rig
 * mesh + tiny animation-only GLBs whose tracks retarget onto the rig's
 * skeleton (same source model = same bone names). Crossfaded clip changes,
 * one-shot replays via nonce, pause support for hitstop/hitstun.
 */
export function FighterRig({ rigUrl, clips, height, driver }: FighterRigProps) {
  const { scene, animations: rigAnims } = useGLTF(rigUrl);
  const clipKeys = useMemo(() => Object.keys(clips), [clips]);
  const clipGltfs = useGLTF(clipKeys.map((k) => clips[k]));

  const rig = useMemo(() => {
    const model = skeletonClone(scene);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map<string, THREE.AnimationAction>();
    clipKeys.forEach((key, i) => {
      const clip = clipGltfs[i]?.animations?.[0];
      if (clip) actions.set(key, mixer.clipAction(clip));
    });
    if (rigAnims[0]) {
      actions.set('__rig', mixer.clipAction(rigAnims[0]));
      // carve a breathing GUARD IDLE from the first 28% of the rig's own
      // guard-prep clip, ping-ponged — no more slow-motion-walk statues
      const d = rigAnims[0].duration;
      const idleClip = THREE.AnimationUtils.subclip(rigAnims[0], 'guardIdle', 0, Math.max(2, Math.floor(d * 30 * 0.28)), 30);
      const idle = mixer.clipAction(idleClip);
      idle.setLoop(THREE.LoopPingPong, Infinity);
      actions.set('idle', idle);
    }

    // bones for the procedural life layer (breath, head-track, hit recoil)
    const bones: { spine: THREE.Bone[]; head: THREE.Bone | null } = { spine: [], head: null };
    model.traverse((o) => {
      const b = o as THREE.Bone;
      if (!b.isBone) return;
      const n = b.name.toLowerCase();
      if (/spine|chest|upperchest/.test(n) && bones.spine.length < 2) bones.spine.push(b);
      if (!bones.head && /head/.test(n)) bones.head = b;
    });

    // pose with a real clip BEFORE measuring — bind poses lie about size
    const poseKey = actions.has('walk') ? 'walk' : clipKeys[0];
    const poseAction = actions.get(poseKey);
    if (poseAction) {
      poseAction.play();
      mixer.update(0.01);
    }

    const measure = () => {
      model.updateMatrixWorld(true);
      const box = new THREE.Box3();
      model.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (m.isSkinnedMesh) {
          m.computeBoundingBox();
          if (m.boundingBox) box.union(m.boundingBox.clone().applyMatrix4(m.matrixWorld));
        } else if ((o as THREE.Mesh).isMesh) {
          const g = (o as THREE.Mesh).geometry;
          g.computeBoundingBox();
          if (g.boundingBox) box.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld));
        }
      });
      return box;
    };
    const box = measure();
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = height / Math.max(size.y, 0.001);
    model.scale.setScalar(s);
    const box2 = measure();
    const center = new THREE.Vector3();
    box2.getCenter(center);
    model.position.set(-center.x, -box2.min.y, -center.z);

    if (poseAction) {
      poseAction.stop();
      mixer.update(0);
    }
    return { model, mixer, actions, bones };
  }, [scene, clipKeys, clipGltfs, rigAnims, height]);
  const { model, mixer, actions, bones } = rig;

  const current = useRef<{ clip: string; nonce: number } | null>(null);
  const lifeT = useRef(rigUrl.length * 1.73); // deterministic per-rig phase offset
  const recoil = useRef(0);

  /* eslint-disable react-hooks/immutability -- imperative animation control */
  useFrame((_, dt) => {
    const intent = driver();
    const action = actions.get(intent.clip);
    const nonce = intent.nonce ?? 0;

    if (action && (current.current?.clip !== intent.clip || current.current?.nonce !== nonce)) {
      const prev = current.current ? actions.get(current.current.clip) : undefined;
      if (prev && prev !== action) prev.fadeOut(0.09);
      action.reset();
      action.setLoop(intent.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      action.fadeIn(0.09);
      action.play();
      current.current = { clip: intent.clip, nonce };
    }
    if (action) action.timeScale = intent.speed ?? 1;

    // hitstop freezes both fighters mid-swing — the Smash juice
    const frozen = intent.paused || boss.hitstopT > 0;
    mixer.update(frozen ? 0 : Math.min(dt, 0.05) * (boss.active ? boss.timeScale : 1));

    // ---- life layer: applied AFTER the mixer so it rides every pose ----
    lifeT.current += dt;
    const t = lifeT.current;
    recoil.current = Math.max(0, recoil.current - dt * 6);
    if ((intent.recoil ?? 0) > recoil.current) recoil.current = intent.recoil ?? 0;
    for (let i = 0; i < bones.spine.length; i += 1) {
      const b = bones.spine[i];
      b.rotation.x += Math.sin(t * 2.1 + i) * 0.02 + recoil.current * 0.35; // breathe + snap back on hit
      b.rotation.z += Math.sin(t * 1.4 + i * 1.7) * 0.012;
    }
    if (bones.head) {
      bones.head.rotation.y += Math.sin(t * 0.9) * 0.05 + (intent.face ?? 0) * 0.22; // alive + eyeing the opponent
      bones.head.rotation.x += recoil.current * 0.5;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return <primitive object={model} />;
}
