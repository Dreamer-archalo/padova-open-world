export class TaxiDriverNPC {
  constructor({scene, createPerson, THREE, terrain, collision, collides} = {}) {
    this.scene = scene;
    this.createPerson = createPerson;
    this.THREE = THREE;
    this.terrain = terrain;
    this.collision = collision;
    this.collides = collides;
    this.object = null;
    this.baseY = 0;
    this.visibleSince = 0;
  }

  ensure() {
    if (this.object) return this.object;
    if (!this.scene || !this.createPerson || !this.THREE) throw new Error('TaxiDriverNPC dependencies missing');

    const driver = this.createPerson('#b9a46e', 77);
    const glass = new this.THREE.MeshStandardMaterial({color: '#101719', roughness: .25, metalness: .35});
    for (const side of [-1, 1]) {
      const lens = new this.THREE.Mesh(new this.THREE.BoxGeometry(.15, .085, .035), glass.clone());
      lens.position.set(side * .09, 1.64, .19);
      driver.add(lens);
    }
    const bridge = new this.THREE.Mesh(new this.THREE.BoxGeometry(.06, .025, .04), glass.clone());
    bridge.position.set(0, 1.64, .19);
    driver.add(bridge);
    driver.visible = false;
    driver.userData.taxiDriver = true;
    this.scene.add(driver);
    this.object = driver;
    return driver;
  }

  hide() {
    if (this.object) this.object.visible = false;
  }

  showBeside(car, time = 0) {
    if (!car) return null;
    const driver = this.ensure();
    const distance = 1.2 + car.spec.width / 2;
    let spot = null;

    for (const side of [1, -1]) {
      const x = car.x + Math.cos(car.yaw) * distance * side;
      const z = car.z - Math.sin(car.yaw) * distance * side;
      const y = this.terrain.height(x, z, car.y);
      const blocked = this.collides?.(x, z, .4, this.collision, y);
      if (this.terrain.dry(x, z, .4, y) && !blocked) {
        spot = {x, z, y};
        break;
      }
    }

    spot ??= {x: car.x, z: car.z, y: car.y ?? this.terrain.height(car.x, car.z)};
    driver.position.set(spot.x, spot.y, spot.z);
    driver.rotation.y = car.yaw + Math.PI;
    driver.visible = true;
    this.baseY = spot.y;
    this.visibleSince = Number.isFinite(time) ? time : 0;
    return driver;
  }

  canInteract(player, maxDistance = 3.3) {
    const driver = this.object;
    if (!driver?.visible || !player) return false;
    return Math.hypot(player.x - driver.position.x, player.z - driver.position.z) <= maxDistance;
  }

  update(time = 0) {
    const driver = this.object;
    if (!driver?.visible) return;
    const t = Number.isFinite(time) ? time : 0;
    driver.position.y = this.baseY + Math.sin((t - this.visibleSince) * 2.1) * .015;
    driver.rotation.z = Math.sin((t - this.visibleSince) * 1.15) * .012;
  }
}
