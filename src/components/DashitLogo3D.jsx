import { useMemo } from "react";
import { ExtrudeGeometry, Box3, Vector3 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { DASHIT_MARK_SVG, MARK_NAVY, MARK_ORANGE } from "./dashitMarkSvg";

/**
 * The DASHit mark, extruded from its real outlines.
 *
 * The shapes come from a trace of the logo art rather than from hand-fitted
 * primitives — see dashitMarkSvg.js. An earlier version reconstructed the mark
 * from measurements (rounded quads plus a half-annulus) and got the "D" wrong:
 * its ends are not cut square, they taper, and the approximation ran into the
 * bars instead of leaving the gap the artwork has.
 */

/* Thickness is declared in WORLD units and converted to trace units below.
   Stated directly in trace units it was ~6x too thin once the mark got
   normalised, and the logo read as a flat sticker. */
const DEPTH_WORLD = 0.22;
const BEVEL_WORLD = 0.014;

/** Target width in world units, so framing is independent of the trace's scale. */
const TARGET_WIDTH = 2.2;

export default function DashitLogo3D({ navy = MARK_NAVY, orange = MARK_ORANGE }) {
  const { groups, fit } = useMemo(() => {
    const parsed = new SVGLoader().parse(DASHIT_MARK_SVG);

    /* Group by the fill each path carries, so the orange bar keeps its own
       material instead of every shape landing in one mesh. */
    const byColour = new Map();
    for (const path of parsed.paths) {
      const hex = `#${path.color.getHexString()}`;
      if (!byColour.has(hex)) byColour.set(hex, []);
      byColour.get(hex).push(...SVGLoader.createShapes(path));
    }

    /* Measure the flat outline first: the extrusion depth has to be expressed
       in the trace's own units, and that conversion needs the final scale. */
    let minX = Infinity, maxX = -Infinity;
    for (const shapes of byColour.values()) {
      for (const shape of shapes) {
        for (const pt of shape.getPoints(4)) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
        }
      }
    }
    const scale = TARGET_WIDTH / (maxX - minX);
    const toUnits = (world) => world / scale;

    const extrude = {
      depth: toUnits(DEPTH_WORLD),
      bevelEnabled: true,
      bevelThickness: toUnits(BEVEL_WORLD),
      bevelSize: toUnits(BEVEL_WORLD),
      bevelSegments: 3,
      curveSegments: 12,
    };

    const groups = [...byColour.entries()].map(([hex, shapes]) => ({
      hex,
      geometry: shapes.map((sh) => new ExtrudeGeometry(sh, extrude)),
    }));

    const box = new Box3();
    for (const g of groups) {
      for (const geo of g.geometry) {
        geo.computeBoundingBox();
        box.union(geo.boundingBox);
      }
    }
    const centre = box.getCenter(new Vector3());

    return { groups, fit: { scale, centre } };
  }, []);

  return (
    /* SVG space has Y pointing down, so the whole mark is flipped on Y once
       here rather than negating every coordinate in the trace. */
    <group scale={[fit.scale, -fit.scale, fit.scale]}>
      <group position={[-fit.centre.x, -fit.centre.y, -fit.centre.z]}>
        {groups.map((g) =>
          g.geometry.map((geo, i) => (
            <mesh key={`${g.hex}-${i}`} geometry={geo} castShadow>
              <meshStandardMaterial
                color={g.hex.toLowerCase() === MARK_ORANGE.toLowerCase() ? orange : navy}
                roughness={0.55}
                metalness={0.04}
              />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}
