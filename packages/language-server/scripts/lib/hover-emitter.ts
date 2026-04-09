/**
 * hover-emitter.ts
 *
 * Generates hoverData.generated.ts from RailSim II help HTML files.
 * Uses html-reader for HTML parsing, keeps FILE_TO_OBJECTS / SYM_FILE_TO_OBJECT
 * mapping locally.
 *
 * Original help documents: Copyright (C) 2003-2009 インターネット停留所
 * Licensed under LGPL v2.1
 */

import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readHelpHtml, extractPropertyDocs, extractOverview } from "./html-reader.js";

const DOCS_BASE_URL = "https://railsim2-support.simochee.net/help";

// ── Types ────────────────────────────────────────────────────────────────────

interface ObjectDoc {
  description: string;
  helpUrl: string;
  properties: Record<string, string>;
}

// ── Mapping: HTML filename → object names defined in that file ───────────────

const FILE_TO_OBJECTS: Record<string, string[]> = {
  "pi_rail.html": ["RailInfo", "SoundInfo"],
  "pi_tie.html": ["TieInfo"],
  "pi_girder.html": ["GirderInfo"],
  "pi_pier.html": ["PierInfo"],
  "pi_line.html": ["LineInfo"],
  "pi_pole.html": ["PoleInfo"],
  "pi_train.html": ["TrainInfo"],
  "pi_station.html": ["StationInfo"],
  "pi_struct.html": ["StructInfo"],
  "pi_surface.html": ["SurfaceInfo"],
  "pi_env.html": ["EnvInfo"],
  "pi_skin.html": [],
  "pi_profile.html": ["Profile"],
};

// Mapping: pi_sym_*.html → object name in schema
const SYM_FILE_TO_OBJECT: Record<string, string> = {
  "pi_sym_plugin_header.html": "PluginHeader",
  "pi_sym_profile.html": "Profile",
  "pi_sym_profile_face.html": "Face",
  "pi_sym_profile_vertex.html": "Vertex",
  "pi_sym_profile_list.html": "Profile",
  "pi_sym_wireframe.html": "Wireframe",
  "pi_sym_wireframe_line.html": "Line",
  "pi_sym_wireframe_vertex.html": "Vertex:Wireframe",
  "pi_sym_interval.html": "Interval",
  "pi_sym_object_3d.html": "Object3D",
  "pi_sym_object_zy.html": "ObjectZY",
  "pi_sym_object_joint_3d.html": "Joint3D",
  "pi_sym_object_joint_zy.html": "JointZY",
  "pi_sym_object_joint_zyx.html": "JointZYX",
  "pi_sym_axle_object.html": "Axle",
  "pi_sym_body_object.html": "Body",
  "pi_sym_body_tilt_info.html": "Tilt",
  "pi_sym_crank_zy.html": "CrankZY",
  "pi_sym_crank_slide_zy.html": "PistonZY",
  "pi_sym_piston_zy.html": "PistonZY",
  "pi_sym_triangle_zy.html": "TriangleZY",
  "pi_sym_triangle_link_zy.html": "Link",
  "pi_sym_static_rotator.html": "StaticRotation",
  "pi_sym_static_mover.html": "StaticMove",
  "pi_sym_dynamic_rotator.html": "DynamicRotation",
  "pi_sym_windmill.html": "Windmill",
  "pi_sym_wind_tracker.html": "TrackWind",
  "pi_sym_whiteout.html": "Whiteout",
  "pi_sym_platform.html": "Platform",
  "pi_sym_sound_effector.html": "Sound",
  "pi_sym_particle_applier.html": "Particle",
  "pi_sym_lens_flare.html": "LensFlare",
  "pi_sym_material_changer.html": "ChangeMaterial",
  "pi_sym_model_changer.html": "Model",
  "pi_sym_model_switch.html": "DefineSwitch",
  "pi_sym_model_option.html": "Model",
  "pi_sym_animation_applier.html": "DefineAnimation",
  "pi_sym_animation_frame.html": "Frame",
  "pi_sym_animation_numbered_frame.html": "NumberedFrame",
  "pi_sym_animation_rotation_uv_frame.html": "DefineAnimation",
  "pi_sym_animation_slide_uv_frame.html": "DefineAnimation",
  "pi_sym_animation_tiled_uv_frame.html": "DefineAnimation",
  "pi_sym_animation_texture_transformer.html": "Texture",
  "pi_sym_texture_changer.html": "Texture",
  "pi_sym_texture_transformer.html": "Texture",
  "pi_sym_alpha_changer.html": "Material",
  "pi_sym_alpha_tester.html": "Material",
  "pi_sym_shadow_inhibitor.html": "Material",
  "pi_sym_headlight_applier.html": "Headlight",
  "pi_sym_effector.html": "SoundEffect",
  "pi_sym_effector_switch_applier.html": "SoundEffect",
  "pi_sym_cursor_info.html": "NormalCursor",
  "pi_sym_skin_cursor_info.html": "NormalCursor",
  "pi_sym_skin_background_info.html": "Background",
  "pi_sym_skin_frame_info.html": "Interface",
  "pi_sym_skin_interface_info.html": "Interface",
  "pi_sym_skin_listview_info.html": "ListView",
  "pi_sym_skin_editctrl_info.html": "EditCtrl",
  "pi_sym_skin_plugintree_info.html": "PluginTree",
  "pi_sym_skin_popupmenu_info.html": "PopupMenu",
  "pi_sym_skin_sound_info.html": "SoundEffect",
  "pi_sym_skin_model_info.html": "Model",
  "pi_sym_named_object_info.html": "Object3D",
  "pi_sym_static_timing_info.html": "DefineAnimation",
  "pi_sym_customizer.html": "DefineSwitch",
  "pi_sym_customizer_switch_applier.html": "DefineSwitch",
  "pi_sym_pier_base_info.html": "Base",
  "pi_sym_pier_head_info.html": "Head",
  "pi_sym_pier_joint_info.html": "Joint",
  "pi_sym_rail_brancher.html": "RailInfo",
  "pi_sym_rail_connector.html": "RailInfo",
  "pi_sym_rail_disconnector.html": "RailInfo",
  "pi_sym_env_lighting.html": "Lighting",
  "pi_sym_env_landscape_info.html": "Landscape",
  "pi_sym_env_mapper.html": "EnvInfo",
  "pi_sym_env_sun_info.html": "Sun",
  "pi_sym_env_moon_info.html": "Moon",
  "pi_sym_light_setting.html": "Lighting",
  "pi_sym_train_free_object.html": "Object3D",
};

// ── Main ─────────────────────────────────────────────────────────────────────

export function emitHoverData(helpDir: string, outputPath: string): void {
  const objectDocs: Record<string, ObjectDoc> = {};

  // 1. Process plugin definition pages (pi_rail.html, pi_tie.html, etc.)
  for (const [filename, objectNames] of Object.entries(FILE_TO_OBJECTS)) {
    const filePath = resolve(helpDir, filename);
    const $ = readHelpHtml(filePath);
    const overview = extractOverview($);
    const props = extractPropertyDocs($);
    const helpUrl = `${DOCS_BASE_URL}/${filename}`;

    // First listed object gets the overview and all properties
    if (objectNames.length > 0) {
      const primaryObject = objectNames[0];
      objectDocs[primaryObject] = {
        description: overview ?? "",
        helpUrl,
        properties: Object.fromEntries(props),
      };

      // Secondary objects (e.g. SoundInfo in pi_rail.html) get the same helpUrl
      for (let i = 1; i < objectNames.length; i++) {
        objectDocs[objectNames[i]] = {
          description: "",
          helpUrl,
          properties: {},
        };
      }
    }
  }

  // 2. Process symbol pages (pi_sym_*.html) — extract descriptions and merge properties
  const symFiles = readdirSync(helpDir).filter(
    (f) => f.startsWith("pi_sym_") && f.endsWith(".html"),
  );

  for (const filename of symFiles) {
    const filePath = resolve(helpDir, filename);
    const $ = readHelpHtml(filePath);
    const overview = extractOverview($);
    const props = extractPropertyDocs($);
    const helpUrl = `${DOCS_BASE_URL}/${filename}`;

    // Merge properties into the mapped object
    const objectName = SYM_FILE_TO_OBJECT[filename];
    if (objectName && props.size > 0) {
      if (!objectDocs[objectName]) {
        objectDocs[objectName] = {
          description: overview ?? "",
          helpUrl,
          properties: {},
        };
      }
      for (const [propName, propDesc] of props) {
        // Don't overwrite if already set from main page
        if (!objectDocs[objectName].properties[propName]) {
          objectDocs[objectName].properties[propName] = propDesc;
        }
      }
    }
  }

  // 3. Generate TypeScript output
  const output = `/**
 * Auto-generated hover documentation data.
 * Extracted from RailSim II help documents.
 *
 * Original: Copyright (C) 2003-2009 インターネット停留所
 * License: LGPL v2.1
 *
 * DO NOT EDIT — regenerate with: npx tsx scripts/extract-hover-data.ts
 */

export interface PropertyDoc {
  /** Japanese description of the property */
  description: string;
}

export interface ObjectDoc {
  /** Japanese description of the object/block */
  description: string;
  /** URL to the help page on GitHub Pages */
  helpUrl: string;
  /** Property documentation keyed by property name */
  properties: Record<string, PropertyDoc>;
}

/** Documentation for object blocks (RailInfo, TieInfo, etc.) */
export const objectDocs: Record<string, ObjectDoc> = ${JSON.stringify(
    // Transform to include PropertyDoc structure
    Object.fromEntries(
      Object.entries(objectDocs).map(([name, doc]) => [
        name,
        {
          description: doc.description,
          helpUrl: doc.helpUrl,
          properties: Object.fromEntries(
            Object.entries(doc.properties).map(([prop, desc]) => [prop, { description: desc }]),
          ),
        },
      ]),
    ),
    null,
    2,
  )};

/** Lookup property documentation in context of an object */
export function getPropertyDoc(
  objectName: string,
  propertyName: string
): PropertyDoc | undefined {
  return objectDocs[objectName]?.properties[propertyName];
}

/** Lookup object documentation */
export function getObjectDoc(objectName: string): ObjectDoc | undefined {
  return objectDocs[objectName];
}
`;

  writeFileSync(outputPath, output, "utf-8");

  // Stats
  const objCount = Object.keys(objectDocs).length;
  const propCount = Object.values(objectDocs).reduce(
    (sum, o) => sum + Object.keys(o.properties).length,
    0,
  );
  console.log(`Generated hover data: ${objCount} objects, ${propCount} properties → ${outputPath}`);
}
