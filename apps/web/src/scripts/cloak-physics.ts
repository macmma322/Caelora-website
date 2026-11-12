import type * as Three from 'three';

// Spring-bone cloak: a browser port of the game's SpringChainSolver on the Cloak_* bones (Verlet
// tail particles, damping, spring toward rest, 55° bend limit). Each simulated bone tracks a tail
// particle (the next bone's head); the tail is kept at bone length and within the bend limit of
// rest, then the bone is re-aimed at it. Turning the study swings the cloak because the tails lag.
// Unlike the game there is no body to hang on, so gravity is not added: the authored rest pose
// already hangs, and is the equilibrium. Stiffer and more damped than the game (6, 3/s), where air
// drag and the wearer's body calm the cloth; scripts/check-cloak-physics.mjs guards the tuning.
const STIFFNESS = 60; // 1/s²
const DAMPING = 12; // 1/s
const BREEZE = 0.6; // m/s², side-to-side sway averaging to zero
const MAX_BEND = Math.cos((55 * Math.PI) / 180);
const STEP = 1 / 60;

interface Joint {
  bone: Three.Bone;
  rest: Three.Quaternion; // local rest rotation
  axis: Three.Vector3; // local direction to the tail at rest
  length: number; // world length
  tail: Three.Vector3;
  prev: Three.Vector3;
}

export interface CloakPhysics {
  /** Advances the simulation by `seconds` (fixed 60 Hz steps). */
  update(seconds: number): void;
}

export function createCloakPhysics(THREE: typeof Three, root: Three.Object3D): CloakPhysics | null {
  root.updateWorldMatrix(true, true);
  const joints: Joint[] = [];
  root.traverse((node) => {
    const child = node.children.find((c) => (c as Three.Bone).isBone);
    if (!(node as Three.Bone).isBone || !/^Cloak_[LCR]_/.test(node.name) || !child) return;
    const tail = child.getWorldPosition(new THREE.Vector3());
    joints.push({
      bone: node as Three.Bone,
      rest: node.quaternion.clone(),
      axis: child.position.clone().normalize(),
      length: tail.distanceTo(node.getWorldPosition(new THREE.Vector3())),
      tail,
      prev: tail.clone(),
    });
  });
  // traverse() is depth-first, so a parent joint always steps before its children.
  if (!joints.length) return null;

  // The rig is authored in metres; convert the forces into the study's scaled world units.
  const unit = root.getWorldScale(new THREE.Vector3()).x * STEP * STEP;
  const stiffness = Math.min(STIFFNESS * STEP * STEP, 0.5);
  const keep = 1 - DAMPING * STEP;
  const head = new THREE.Vector3();
  const next = new THREE.Vector3();
  const rest = new THREE.Vector3();
  const side = new THREE.Vector3();
  const parentRotation = new THREE.Quaternion();
  const restWorld = new THREE.Quaternion();
  const aim = new THREE.Quaternion();
  let time = 0;
  let pending = 0;

  const step = () => {
    time += STEP;
    root.updateWorldMatrix(true, true);
    const breeze = BREEZE * (0.7 * Math.sin(time * 0.9) + 0.3 * Math.sin(time * 0.37 + 1));
    for (const joint of joints) {
      const { bone, length } = joint;
      bone.parent!.getWorldQuaternion(parentRotation);
      restWorld.multiplyQuaternions(parentRotation, joint.rest);
      bone.getWorldPosition(head);
      rest.copy(joint.axis).applyQuaternion(restWorld);

      // Verlet: damped inertia + breeze + spring toward the rest tail.
      next.subVectors(joint.tail, joint.prev).multiplyScalar(keep).add(joint.tail);
      next.x += breeze * unit;
      side.copy(rest).multiplyScalar(length).add(head).sub(joint.tail);
      next.addScaledVector(side, stiffness);

      // Keep the bone length, and no more than the bend limit away from rest.
      next.sub(head).normalize();
      const bend = next.dot(rest);
      if (bend < MAX_BEND) {
        side.copy(next).addScaledVector(rest, -bend).normalize();
        next
          .copy(rest)
          .multiplyScalar(MAX_BEND)
          .addScaledVector(side, Math.sqrt(1 - MAX_BEND ** 2));
      }
      aim.setFromUnitVectors(rest, next);
      next.multiplyScalar(length).add(head);
      joint.prev.copy(joint.tail);
      joint.tail.copy(next);

      // Re-aim the bone: its rest rotation, turned onto the new tail direction.
      bone.quaternion.copy(parentRotation.invert()).multiply(aim).multiply(restWorld);
      bone.updateWorldMatrix(false, true);
    }
  };

  return {
    update(seconds) {
      pending = Math.min(pending + seconds, STEP * 4);
      while (pending >= STEP) {
        pending -= STEP;
        step();
      }
    },
  };
}
