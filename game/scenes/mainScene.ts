import {JoyStick, Scene3D, THREE} from '@enable3d/phaser-extension';
import Tank, {WheelPosition} from '../models/Tank';
import {type ExtendedGroup} from 'enable3d';
import {GUI} from 'lil-gui';

export default class MainScene extends Scene3D {
	private tank?: Tank;
	private keys = {
		w: false,
		a: false,
		s: false,
		d: false,
		up: false,
		down: false,
		left: false,
		right: false,
		space: false,
		alt: false,
	};

	private vehicleSteering = 0;

	constructor() {
		super({key: 'MainScene'});
	}

	init() {
		console.log('init');
		this.accessThirdDimension();
		this.third.renderer.outputEncoding = THREE.LinearEncoding;

		const keyEvent = (e: KeyboardEvent, down: boolean) => {
			switch (e.code) {
				case 'KeyW':
					this.keys.w = down;
					break;
				case 'KeyA':
					this.keys.a = down;
					break;
				case 'KeyS':
					this.keys.s = down;
					break;
				case 'KeyD':
					this.keys.d = down;
					break;
				case 'Space':
					this.keys.space = down;
					break;
				case 'ArrowUp':
					this.keys.up = down;
					break;
				case 'ArrowDown':
					this.keys.down = down;
					break;
				case 'ArrowLeft':
					this.keys.left = down;
					break;
				case 'ArrowRight':
					this.keys.right = down;
					break;
				case 'AltLeft':
					this.keys.alt = down;
					break;
				default:
			}
		};

		document.addEventListener('keydown', e => {
			e.preventDefault();
			keyEvent(e, true);
		});
		document.addEventListener('keyup', e => {
			e.preventDefault();
			keyEvent(e, false);
		});
	}

	async create() {
		const {lights} = await this.third.warpSpeed();
		if (lights) {
			const intensity = 0.4;
			lights.hemisphereLight.intensity = intensity;
			lights.ambientLight.intensity = intensity;
			lights.directionalLight.intensity = intensity;
		}

		const tankGlb = await this.third.load.gltf('/glb/tank.glb');
		const tankModel = tankGlb.scenes[0] as ExtendedGroup;

		this.tank = new Tank(this.third, tankModel);
		this.third.add.existing(this.tank);

		// Use the car camera
		// this.third.camera = this.car.camera

		const joystick = new JoyStick();
		const axis = joystick.add.axis({
			styles: {left: 35, bottom: 35, size: 100},
		});
		axis.onMove(delta => {
			const d = delta as never as {right: number; top: number};
			this.vehicleSteering = d.right * 0.5;

			this.tank?.vehicle.applyEngineForce(d.top * 5000, WheelPosition.RearLeft);
			this.tank?.vehicle.applyEngineForce(d.top * 5000, WheelPosition.RearRight);
		});

		const panel = new GUI();
		const params = {
			debug: false,
			mode: 2049,
		};
		panel.add(params, 'debug').onChange((value: boolean) => {
			if (value) {
				this.third.physics.debug?.enable();
			} else {
				this.third.physics.debug?.disable();
			}
		});
		panel.add(params, 'mode', [1 + 2048, 1 + 4096, 1 + 2048 + 4096]).onChange((value: number) => {
			this.third.physics.debug?.mode(value);
		});
	}

	update() {
		if (!this.tank) {
			return;
		}

		let engineForce = 0;
		let breakingForce = 0;
		const steeringIncrement = 0.04;
		const steeringClamp = 0.5;
		const maxEngineForce = 2000;
		const maxBreakingForce = 100;

		// Front/back
		if (this.keys.w) {
			engineForce = maxEngineForce;
		} else if (this.keys.s) {
			engineForce = -maxEngineForce;
		}

		if (this.keys.a) {
			if (this.vehicleSteering < steeringClamp) {
				this.vehicleSteering += steeringIncrement;
			}
		} else if (this.keys.d) {
			if (this.vehicleSteering > -steeringClamp) {
				this.vehicleSteering -= steeringIncrement;
			}
		} else {
			if (this.vehicleSteering > 0) {
				this.vehicleSteering -= steeringIncrement / 2;
			}

			if (this.vehicleSteering < 0) {
				this.vehicleSteering += steeringIncrement / 2;
			}

			if (Math.abs(this.vehicleSteering) <= steeringIncrement) {
				this.vehicleSteering = 0;
			}
		}

		// Break
		if (this.keys.alt) {
			breakingForce = maxBreakingForce;
		}

		if (this.keys.space) {
			this.tank.shoot();
		}

		this.tank.vehicle.applyEngineForce(engineForce, WheelPosition.FrontLeft);
		this.tank.vehicle.applyEngineForce(engineForce, WheelPosition.FrontRight);

		this.tank.vehicle.setSteeringValue(this.vehicleSteering, WheelPosition.FrontLeft);
		this.tank.vehicle.setSteeringValue(this.vehicleSteering, WheelPosition.FrontRight);

		this.tank.vehicle.setBrake(breakingForce / 2, WheelPosition.FrontLeft);
		this.tank.vehicle.setBrake(breakingForce / 2, WheelPosition.FrontRight);
		this.tank.vehicle.setBrake(breakingForce, WheelPosition.RearLeft);
		this.tank.vehicle.setBrake(breakingForce, WheelPosition.RearRight);

		this.tank.canonMotor.enableAngularMotor(true,
			this.keys.up ? -2 : this.keys.down ? 2 : 0,
			10);

		this.tank.towerMotor.enableAngularMotor(true,
			this.keys.right ? 2 : this.keys.left ? -2 : 0,
			10);

		this.tank.update();
	}
}
