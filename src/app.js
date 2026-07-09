// ============================================
// 3MF Viewer — Main Application
// IndexedDB Storage · .3mf Parsing · Three.js 3D · Settings Panel
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';

// ─────────────────────────────────────
// Constants
// ─────────────────────────────────────

const DB_NAME = '3mf-viewer-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_FILES = 'files';

// Settings categories — matching Bambu Studio layout (English)
const SETTINGS_CATEGORIES = [
  {
    id: 'quality',
    icon: '🔧',
    label: 'Quality',
    keys: [
      'layer_height', 'initial_layer_print_height', 'line_width',
      'initial_layer_line_width', 'outer_wall_line_width', 'inner_wall_line_width',
      'top_surface_line_width', 'infill_line_width', 'support_line_width',
      'resolution', 'slice_closing_radius', 'nozzle_diameter',
      'seam_position', 'wall_generator',
    ],
  },
  {
    id: 'strength',
    icon: '🛡️',
    label: 'Strength',
    keys: [
      'wall_loops', 'top_shell_layers', 'bottom_shell_layers',
      'top_shell_thickness', 'bottom_shell_thickness',
      'sparse_infill_density', 'sparse_infill_pattern',
      'infill_direction', 'infill_combination',
      'top_surface_pattern', 'bottom_surface_pattern',
      'internal_solid_infill_pattern',
      'detect_thin_wall', 'only_one_wall_top',
      'ensure_vertical_shell_thickness', 'wall_infill_order',
      'minimum_sparse_infill_area', 'infill_wall_overlap',
      'infill_anchor', 'infill_anchor_max',
    ],
  },
  {
    id: 'speed',
    icon: '⚡',
    label: 'Speed',
    keys: [
      'outer_wall_speed', 'inner_wall_speed', 'sparse_infill_speed',
      'internal_solid_infill_speed', 'top_surface_speed', 'gap_infill_speed',
      'support_speed', 'support_interface_speed', 'travel_speed',
      'initial_layer_speed', 'initial_layer_infill_speed', 'bridge_speed',
      'enable_overhang_speed', 'overhang_1_4_speed', 'overhang_2_4_speed',
      'overhang_3_4_speed', 'overhang_4_4_speed',
      'slow_down_for_layer_cooling', 'slow_down_min_speed',
      'default_acceleration', 'outer_wall_acceleration', 'inner_wall_acceleration',
      'initial_layer_acceleration', 'top_surface_acceleration',
      'travel_acceleration', 'default_jerk', 'outer_wall_jerk', 'inner_wall_jerk',
    ],
  },
  {
    id: 'temperature',
    icon: '🌡️',
    label: 'Temperature',
    keys: [
      'nozzle_temperature', 'nozzle_temperature_initial_layer',
      'nozzle_temperature_range_low', 'nozzle_temperature_range_high',
      'bed_temperature', 'bed_temperature_initial_layer',
      'chamber_temperatures',
      'hot_plate_temp', 'hot_plate_temp_initial_layer',
      'cool_plate_temp', 'cool_plate_temp_initial_layer',
      'eng_plate_temp', 'eng_plate_temp_initial_layer',
      'textured_plate_temp', 'textured_plate_temp_initial_layer',
    ],
  },
  {
    id: 'cooling',
    icon: '💨',
    label: 'Cooling',
    keys: [
      'fan_min_speed', 'fan_max_speed', 'overhang_fan_speed',
      'overhang_fan_threshold', 'close_fan_the_first_x_layers',
      'full_fan_speed_layer', 'fan_cooling_layer_time',
      'slow_down_layer_time', 'additional_cooling_fan_speed',
      'reduce_fan_stop_start_freq', 'auxiliary_fan',
    ],
  },
  {
    id: 'retraction',
    icon: '🔄',
    label: 'Retraction',
    keys: [
      'retraction_length', 'retract_length_toolchange', 'retraction_speed',
      'deretraction_speed', 'retract_when_changing_layer',
      'retraction_minimum_travel', 'retract_before_wipe',
      'wipe', 'wipe_distance', 'wipe_speed',
      'z_hop', 'z_hop_types',
      'retract_restart_extra', 'retract_restart_extra_toolchange',
      'long_retractions_when_cut', 'retraction_distances_when_cut',
    ],
  },
  {
    id: 'support',
    icon: '🏗️',
    label: 'Support',
    keys: [
      'enable_support', 'support_type', 'support_threshold_angle',
      'support_base_pattern', 'support_base_pattern_spacing',
      'support_interface_top_layers', 'support_interface_bottom_layers',
      'support_interface_pattern', 'support_interface_spacing',
      'support_object_xy_distance', 'support_top_z_distance', 'support_bottom_z_distance',
      'support_on_build_plate_only', 'support_critical_regions_only',
      'support_expansion', 'support_style',
      'tree_support_branch_angle', 'tree_support_branch_diameter',
      'tree_support_branch_distance', 'tree_support_wall_count',
      'independent_support_layer_height',
    ],
  },
  {
    id: 'filament',
    icon: '🧵',
    label: 'Filament',
    keys: [
      'filament_type', 'filament_diameter', 'filament_density',
      'filament_cost', 'filament_colour', 'filament_flow_ratio',
      'filament_max_volumetric_speed', 'filament_vendor',
      'filament_settings_id', 'temperature_vitrification',
    ],
  },
  {
    id: 'other',
    icon: '📋',
    label: 'Others',
    keys: [
      'print_sequence', 'timelapse_type', 'bed_type',
      'brim_type', 'brim_width', 'brim_object_gap',
      'skirt_loops', 'skirt_distance', 'skirt_height',
      'ironing_type', 'ironing_speed', 'ironing_flow',
      'ooze_prevention', 'prime_tower_enable', 'prime_tower_width',
      'flush_into_objects', 'flush_into_infill', 'flush_into_support',
      'gcode_flavor', 'reduce_infill_retraction_mode',
    ],
  },
];

// Human-readable labels (English, matching Bambu Studio)
const SETTING_LABELS = {
  layer_height: 'Layer Height',
  initial_layer_print_height: 'Initial Layer Height',
  line_width: 'Line Width',
  initial_layer_line_width: 'Initial Layer Line Width',
  outer_wall_line_width: 'Outer Wall Line Width',
  inner_wall_line_width: 'Inner Wall Line Width',
  top_surface_line_width: 'Top Surface Line Width',
  infill_line_width: 'Infill Line Width',
  support_line_width: 'Support Line Width',
  nozzle_diameter: 'Nozzle Diameter',
  wall_loops: 'Wall Loops',
  top_shell_layers: 'Top Shell Layers',
  bottom_shell_layers: 'Bottom Shell Layers',
  top_shell_thickness: 'Top Shell Thickness',
  bottom_shell_thickness: 'Bottom Shell Thickness',
  sparse_infill_density: 'Infill Density',
  sparse_infill_pattern: 'Infill Pattern',
  infill_direction: 'Infill Direction',
  top_surface_pattern: 'Top Surface Pattern',
  bottom_surface_pattern: 'Bottom Surface Pattern',
  internal_solid_infill_pattern: 'Internal Solid Infill Pattern',
  detect_thin_wall: 'Detect Thin Walls',
  only_one_wall_top: 'Only One Wall on Top',
  ensure_vertical_shell_thickness: 'Ensure Vertical Shell Thickness',
  wall_infill_order: 'Wall / Infill Order',
  outer_wall_speed: 'Outer Wall Speed',
  inner_wall_speed: 'Inner Wall Speed',
  sparse_infill_speed: 'Infill Speed',
  internal_solid_infill_speed: 'Internal Solid Infill Speed',
  top_surface_speed: 'Top Surface Speed',
  gap_infill_speed: 'Gap Infill Speed',
  support_speed: 'Support Speed',
  support_interface_speed: 'Support Interface Speed',
  travel_speed: 'Travel Speed',
  initial_layer_speed: 'Initial Layer Speed',
  initial_layer_infill_speed: 'Initial Layer Infill Speed',
  bridge_speed: 'Bridge Speed',
  enable_overhang_speed: 'Enable Overhang Speed',
  overhang_1_4_speed: 'Overhang Speed (10~25%)',
  overhang_2_4_speed: 'Overhang Speed (25~50%)',
  overhang_3_4_speed: 'Overhang Speed (50~75%)',
  overhang_4_4_speed: 'Overhang Speed (75~100%)',
  slow_down_for_layer_cooling: 'Slow Down for Cooling',
  slow_down_min_speed: 'Min Print Speed (Cooling)',
  default_acceleration: 'Normal Acceleration',
  outer_wall_acceleration: 'Outer Wall Acceleration',
  inner_wall_acceleration: 'Inner Wall Acceleration',
  initial_layer_acceleration: 'Initial Layer Acceleration',
  top_surface_acceleration: 'Top Surface Acceleration',
  travel_acceleration: 'Travel Acceleration',
  default_jerk: 'Normal Jerk',
  outer_wall_jerk: 'Outer Wall Jerk',
  inner_wall_jerk: 'Inner Wall Jerk',
  nozzle_temperature: 'Nozzle Temperature',
  nozzle_temperature_initial_layer: 'Nozzle Temp (Initial Layer)',
  nozzle_temperature_range_low: 'Nozzle Temp Range Low',
  nozzle_temperature_range_high: 'Nozzle Temp Range High',
  bed_temperature: 'Bed Temperature',
  bed_temperature_initial_layer: 'Bed Temp (Initial Layer)',
  chamber_temperatures: 'Chamber Temperature',
  hot_plate_temp: 'Hot Plate Temp',
  cool_plate_temp: 'Cool Plate Temp',
  eng_plate_temp: 'Engineering Plate Temp',
  textured_plate_temp: 'Textured Plate Temp',
  fan_min_speed: 'Min Fan Speed',
  fan_max_speed: 'Max Fan Speed',
  overhang_fan_speed: 'Overhang Fan Speed',
  overhang_fan_threshold: 'Overhang Fan Threshold',
  close_fan_the_first_x_layers: 'Close Fan for Initial Layers',
  full_fan_speed_layer: 'Full Fan Speed Layer',
  additional_cooling_fan_speed: 'Aux Fan Speed',
  retraction_length: 'Retraction Length',
  retract_length_toolchange: 'Retraction Length (Toolchange)',
  retraction_speed: 'Retraction Speed',
  deretraction_speed: 'Deretraction Speed',
  retract_when_changing_layer: 'Retract When Changing Layer',
  retraction_minimum_travel: 'Retraction Min Travel',
  retract_before_wipe: 'Retract Before Wipe',
  wipe_distance: 'Wipe Distance',
  wipe_speed: 'Wipe Speed',
  z_hop: 'Z Hop Height',
  z_hop_types: 'Z Hop Type',
  long_retractions_when_cut: 'Long Retraction When Cut',
  retraction_distances_when_cut: 'Retraction Distance When Cut',
  enable_support: 'Enable Support',
  support_type: 'Support Type',
  support_threshold_angle: 'Support Threshold Angle',
  support_base_pattern: 'Support Base Pattern',
  support_base_pattern_spacing: 'Support Base Spacing',
  support_interface_top_layers: 'Support Interface Top Layers',
  support_interface_bottom_layers: 'Support Interface Bottom Layers',
  support_interface_pattern: 'Support Interface Pattern',
  support_interface_spacing: 'Support Interface Spacing',
  support_object_xy_distance: 'Support XY Distance',
  support_top_z_distance: 'Support Top Z Distance',
  support_bottom_z_distance: 'Support Bottom Z Distance',
  support_on_build_plate_only: 'Support on Build Plate Only',
  support_critical_regions_only: 'Support Critical Regions Only',
  support_expansion: 'Support Expansion',
  support_style: 'Support Style',
  tree_support_branch_angle: 'Tree Support Branch Angle',
  tree_support_branch_diameter: 'Tree Support Branch Diameter',
  tree_support_branch_distance: 'Tree Support Branch Distance',
  tree_support_wall_count: 'Tree Support Wall Count',
  independent_support_layer_height: 'Independent Support Layer Height',
  filament_type: 'Filament Type',
  filament_diameter: 'Filament Diameter',
  filament_density: 'Filament Density',
  filament_cost: 'Filament Cost',
  filament_colour: 'Filament Color',
  filament_flow_ratio: 'Flow Ratio',
  filament_max_volumetric_speed: 'Max Volumetric Speed',
  filament_vendor: 'Filament Vendor',
  filament_settings_id: 'Filament Preset',
  temperature_vitrification: 'Vitrification Temperature',
  print_sequence: 'Print Sequence',
  timelapse_type: 'Timelapse Type',
  bed_type: 'Bed Type',
  brim_type: 'Brim Type',
  brim_width: 'Brim Width',
  brim_object_gap: 'Brim Object Gap',
  skirt_loops: 'Skirt Loops',
  skirt_distance: 'Skirt Distance',
  skirt_height: 'Skirt Height',
  ironing_type: 'Ironing',
  ironing_speed: 'Ironing Speed',
  ironing_flow: 'Ironing Flow',
  prime_tower_enable: 'Prime Tower',
  prime_tower_width: 'Prime Tower Width',
  flush_into_objects: 'Flush Into Objects',
  flush_into_infill: 'Flush Into Infill',
  flush_into_support: 'Flush Into Support',
  gcode_flavor: 'G-Code Flavor',
  seam_position: 'Seam Position',
  resolution: 'Resolution',
  reduce_infill_retraction_mode: 'Reduce Infill Retraction',
};

// ─────────────────────────────────────
// IndexedDB Storage Manager
// ─────────────────────────────────────

class StorageManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveProject(project, fileData) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PROJECTS, STORE_FILES], 'readwrite');
      tx.objectStore(STORE_PROJECTS).put(project);
      tx.objectStore(STORE_FILES).put({ id: project.id, data: fileData });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllProjects() {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction(STORE_PROJECTS).objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getFileData(id) {
    return new Promise((resolve, reject) => {
      const store = this.db.transaction(STORE_FILES).objectStore(STORE_FILES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteProject(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PROJECTS, STORE_FILES], 'readwrite');
      tx.objectStore(STORE_PROJECTS).delete(id);
      tx.objectStore(STORE_FILES).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
}

// ─────────────────────────────────────
// 3MF File Parser
// ─────────────────────────────────────

class ThreeMFParser {
  static async parse(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const thumbnail = await this._extractThumbnail(zip);
    const { settings, profiles } = await this._extractSettings(zip);

    return { thumbnail, settings, profiles, arrayBuffer };
  }

  static async _extractThumbnail(zip) {
    const allPaths = Object.keys(zip.files).filter(
      (p) => /\.(png|jpg|jpeg)$/i.test(p) && !zip.files[p].dir
    );

    // Prefer plate thumbnails, then metadata thumbnails, then Auxiliaries thumbnails
    const prioritized = [
      ...allPaths.filter((p) => /plate_\d+\./i.test(p) && !/small/i.test(p) && !/no_light/i.test(p)),
      ...allPaths.filter((p) => /thumbnail_middle/i.test(p) || /thumbnail_3mf/i.test(p)),
      ...allPaths.filter((p) => /thumbnail/i.test(p)),
      ...allPaths,
    ];

    // Deduplicate
    const seen = new Set();
    for (const path of prioritized) {
      if (seen.has(path)) continue;
      seen.add(path);
      try {
        const blob = await zip.files[path].async('blob');
        if (blob.size > 200) return blob;
      } catch { /* skip */ }
    }
    return null;
  }

  static async _extractSettings(zip) {
    const settings = {};
    const profiles = {
      printProfile: '',
      printerProfile: '',
      filamentProfile: '',
      title: '',
      designer: '',
    };

    // 1. Parse from 3D/3dmodel.model metadata
    const modelFile = zip.file('3D/3dmodel.model');
    if (modelFile) {
      try {
        const xml = await modelFile.async('string');
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const metaElements = doc.querySelectorAll('metadata');

        for (const meta of metaElements) {
          const name = meta.getAttribute('name') || '';
          const value = meta.textContent.trim();

          if (name === 'Title') profiles.title = value;
          else if (name === 'Designer') profiles.designer = value;
          else if (name === 'ProfileTitle') profiles.printProfile = profiles.printProfile || value;
          else if (name.includes('print_profile') || name === 'slic3rpe:print_profile') {
            profiles.printProfile = profiles.printProfile || value;
          } else if (name.includes('printer_profile') || name === 'slic3rpe:printer_profile') {
            profiles.printerProfile = value;
          } else if (name.includes('filament_profile') || name === 'slic3rpe:filament_profile') {
            profiles.filamentProfile = value;
          }

          // Config block (slic3rpe:config)
          if (name.includes('config') || name.includes('Config')) {
            this._parseConfigBlock(value, settings);
          }
        }
      } catch (e) { console.warn('Error parsing model metadata:', e); }
    }

    // 2. Parse Metadata/project_settings.config (JSON in Bambu Studio)
    const projectConfig = zip.file('Metadata/project_settings.config');
    if (projectConfig) {
      const raw = await projectConfig.async('string');
      try {
        const json = JSON.parse(raw);
        this._flattenJsonSettings(json, settings);
      } catch {
        // Fallback: try key=value
        this._parseConfigBlock(raw, settings);
      }
    }

    // 3. Parse plate JSON files for nozzle/bed info
    for (const [path, file] of Object.entries(zip.files)) {
      if (/Metadata\/plate_\d+\.json$/i.test(path)) {
        try {
          const json = JSON.parse(await file.async('string'));
          if (json.nozzle_diameter) settings.nozzle_diameter = String(json.nozzle_diameter);
          if (json.bed_type) settings.bed_type = json.bed_type;
        } catch { /* skip */ }
      }
    }

    // 4. Parse filament_settings configs
    const allColors = [];
    for (const [path, file] of Object.entries(zip.files)) {
      if (/Metadata\/filament_settings_\d+\.config$/i.test(path)) {
        try {
          const raw = await file.async('string');
          try {
            const json = JSON.parse(raw);
            if (json.filament_settings_id && !profiles.filamentProfile) {
              profiles.filamentProfile = Array.isArray(json.filament_settings_id)
                ? json.filament_settings_id.join(', ')
                : json.filament_settings_id;
            }
            if (json.filament_colour) {
              const fcStr = Array.isArray(json.filament_colour) ? json.filament_colour.join(',') : String(json.filament_colour);
              fcStr.split(',').forEach(c => {
                if (c.trim()) allColors.push(c.trim());
              });
            }
          } catch { /* not JSON */ }
        } catch { /* skip */ }
      }
    }

    if (allColors.length > 0) {
      const isBoring = (c) => {
        const u = c.toUpperCase();
        return u.startsWith('#FFFFFF') || u.startsWith('#000000') || u.startsWith('FFFFFF') || u.startsWith('000000');
      };
      const vibrant = allColors.find(c => !isBoring(c));
      profiles.color = (vibrant || allColors[0]).slice(0, 7);
      if (!profiles.color.startsWith('#')) profiles.color = '#' + profiles.color;
    }

    return { settings, profiles };
  }

  static _flattenJsonSettings(json, settings) {
    const SKIP_KEYS = new Set([
      'change_filament_gcode', 'machine_start_gcode', 'machine_end_gcode',
      'before_layer_change_gcode', 'layer_change_gcode', 'time_lapse_gcode',
      'template_custom_gcode', 'printing_by_object_gcode',
      'bed_exclude_area', 'thumbnails_format',
      'machine_start_gcode_nc', 'machine_end_gcode_nc',
    ]);

    for (const [key, value] of Object.entries(json)) {
      if (SKIP_KEYS.has(key)) continue;
      if (value === null || value === undefined) continue;

      let displayValue;
      if (Array.isArray(value)) {
        const filtered = value.filter((v) => v !== 'nil' && v !== null && v !== undefined);
        if (filtered.length === 0) continue;
        displayValue = filtered.join(', ');
      } else if (typeof value === 'object') {
        continue;
      } else {
        displayValue = String(value);
      }

      if (displayValue.length > 200) continue;
      if (!displayValue || displayValue === 'nil') continue;

      settings[key] = displayValue;
    }
  }

  static _parseConfigBlock(text, settings) {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (key && value) settings[key] = value;
    }
  }
}

// ─────────────────────────────────────
// 3D Model Viewer
// ─────────────────────────────────────

class ModelViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.animationId = null;
    this.wireframe = false;
    this.autoRotate = false;
  }

  init() {
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181822);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    this.camera.position.set(80, 80, 80);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.6;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotateSpeed = 2;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 3000;

    // Lighting — bright studio setup
    this._setupLights();

    // Build plate grid
    this._addBuildPlateGrid();

    // Render loop
    this._animate();

    // Setup Color Picker
    this.defaultColor = localStorage.getItem('3mf-model-color') || '#00AE42';
    const colorPicker = document.getElementById('model-color-picker');
    if (colorPicker) {
      colorPicker.value = this.defaultColor;
      colorPicker.addEventListener('input', (e) => {
        this.defaultColor = e.target.value;
        localStorage.setItem('3mf-model-color', this.defaultColor);
        if (this.modelMaterial) {
          this.modelMaterial.color.set(this.defaultColor);
        }
        if (this.model) {
          this.model.traverse((child) => {
            if (child.isMesh && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.color.set(this.defaultColor));
              } else {
                child.material.color.set(this.defaultColor);
              }
            }
          });
        }
      });
    }

    // Resize handler
    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }



  _setupLights() {
    // Miękkie oświetlenie otoczenia
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(hemiLight);

    // Główne światło rzucające mocne cienie - kluczowe dla białych obiektów!
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(100, 200, 150);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    // Światło wypełniające z przeciwnej strony (niebieskawe)
    const fill = new THREE.DirectionalLight(0xb0c4ff, 0.6);
    fill.position.set(-150, 100, -100);
    this.scene.add(fill);

    // Światło od tyłu (ciepłe)
    const rim = new THREE.DirectionalLight(0xffcc88, 0.5);
    rim.position.set(0, 150, -250);
    this.scene.add(rim);

  }

  _addBuildPlateGrid() {
    const gridSize = 256;
    const grid = new THREE.GridHelper(gridSize, 16, 0x2a2a3e, 0x1e1e2e);
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    grid.position.y = -0.01;
    this.scene.add(grid);

    // Plate outline
    const half = gridSize / 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -half, 0, -half, half, 0, -half, half, 0, half, -half, 0, half, -half, 0, -half,
    ]), 3));
    this.scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0x00d4ff, opacity: 0.3, transparent: true,
    })));
  }

  async loadModel(arrayBuffer, projectColor = null) {
    const progressBar = document.getElementById('viewer-progress-bar');
    const progressText = document.getElementById('viewer-loading-text');

    const updateProgress = async (text, percent, transition = 'transform 0.2s ease-out') => {
      if (progressText) progressText.textContent = text;
      if (progressBar) {
        progressBar.style.transition = transition;
        progressBar.style.transform = `scaleX(${percent / 100})`;
      }
      // Double requestAnimationFrame ensures the compositor thread picks up the style change
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    };

    await updateProgress('Extracting metadata...', 10);

    if (!projectColor) {
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const allColors = [];
        for (const [path, file] of Object.entries(zip.files)) {
          if (/Metadata\/filament_settings_\d+\.config$/i.test(path)) {
            const raw = await file.async('string');
            try {
              const json = JSON.parse(raw);
              if (json.filament_colour) {
                const fcStr = Array.isArray(json.filament_colour) ? json.filament_colour.join(',') : String(json.filament_colour);
                fcStr.split(',').forEach(c => {
                  if (c.trim()) allColors.push(c.trim());
                });
              }
            } catch { /* skip */ }
          }
        }
        if (allColors.length > 0) {
          const isBoring = (c) => {
            const u = c.toUpperCase();
            return u.startsWith('#FFFFFF') || u.startsWith('#000000') || u.startsWith('FFFFFF') || u.startsWith('000000');
          };
          const vibrant = allColors.find(c => !isBoring(c));
          projectColor = (vibrant || allColors[0]).slice(0, 7);
        }
      } catch (e) {
        console.warn('Could not extract color:', e);
      }
    }

    if (projectColor) {
      if (!projectColor.startsWith('#')) projectColor = '#' + projectColor;
      this.defaultColor = projectColor;
    } else {
      this.defaultColor = localStorage.getItem('3mf-model-color') || '#00AE42';
    }
    const colorPicker = document.getElementById('model-color-picker');
    if (colorPicker) colorPicker.value = this.defaultColor;

    await updateProgress('Preprocessing 3MF...', 25);

    // Cleanup previous
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
      this.model = null;
    }

    // Preprocess Bambu Studio 3MF format to fix ThreeMFLoader limitations
    const processedBuffer = await this._preprocessBambu3MF(arrayBuffer, (percent) => {
      const globalPercent = 25 + (percent / 100) * 30; // Maps 0-100% JSZip to 25-55% global
      if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.transform = `scaleX(${globalPercent / 100})`;
      }
      if (progressText) {
        progressText.textContent = `Preprocessing 3MF... ${Math.round(percent)}%`;
      }
    });

    await updateProgress('Parsing 3D geometry...', 55, 'transform 10s cubic-bezier(0.1, 0.7, 0.1, 1)');
    // We set progress to 95% with a long transition, then immediately block the thread.
    // The CSS animation will run in the compositor thread.
    if (progressBar) progressBar.style.transform = 'scaleX(0.95)';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); // ensure transition starts

    // Parse with ThreeMFLoader (Synchronous - blocks thread)
    const loader = new ThreeMFLoader();
    let group;
    try {
      group = loader.parse(processedBuffer);
    } catch (err) {
      console.error('ThreeMFLoader.parse() error:', err);
      // Pokaż błąd w UI
      const viewerContainer = document.getElementById('viewer-container');
      const errorDiv = document.createElement('div');
      errorDiv.style.position = 'absolute';
      errorDiv.style.top = '50%';
      errorDiv.style.left = '50%';
      errorDiv.style.transform = 'translate(-50%, -50%)';
      errorDiv.style.color = '#ff6b6b';
      errorDiv.style.background = 'rgba(0,0,0,0.8)';
      errorDiv.style.padding = '20px';
      errorDiv.style.borderRadius = '8px';
      errorDiv.style.textAlign = 'center';
      errorDiv.innerHTML = `<h3>Error loading 3D model</h3><p style="margin-top:10px;font-family:monospace;font-size:0.9em;">${err.message || String(err)}</p>`;
      viewerContainer.appendChild(errorDiv);
      throw err;
    }

    // 3MF is Z-up → rotate to Y-up
    group.rotation.set(-Math.PI / 2, 0, 0);
    group.updateMatrixWorld(true);

    // Center model on plate and sit on y=0
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.set(
      group.position.x - center.x,
      group.position.y - box.min.y,
      group.position.z - center.z
    );

    // Bezpieczny materiał Standardowy (Physical bez envMap czasami sprawia problemy w r170)
    if (!this.modelMaterial) {
      this.modelMaterial = new THREE.MeshStandardMaterial({
        color: this.defaultColor || '#00AE42',
        metalness: 0.1,
        roughness: 0.5,
        side: THREE.DoubleSide,
      });
    } else {
      this.modelMaterial.color.set(this.defaultColor || '#00AE42');
    }

    group.traverse((child) => {
      if (child.isMesh) {
        // 1. Wymuś obliczenie normalnych, jeśli ich brakuje (bez nich światło nie działa i model jest czarny)
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        
        // 2. Napraw czarne vertex colors z Bambu Studio, zostawiając te prawdziwe (pomalowane modele)
        if (child.geometry.attributes.color) {
          const colors = child.geometry.attributes.color.array;
          let isAllBlack = true;
          for (let i = 0; i < colors.length; i++) {
            if (colors[i] > 0) { isAllBlack = false; break; }
          }
          if (isAllBlack) {
            child.geometry.deleteAttribute('color');
            if (child.material) {
              const fixMat = m => { m.vertexColors = false; };
              Array.isArray(child.material) ? child.material.forEach(fixMat) : fixMat(child.material);
            }
          }
        }

        // 3. Użyj materiałów z 3MF (wspiera wielokolorowość), lub zablokowanego domyślnego
        let assignedColor = null;
        let current = child;
        
        while(current) {
          if (current.name && current.name.includes('BAMBU_EXTRUDER_')) {
            const match = current.name.match(/BAMBU_EXTRUDER_(\d+)/);
            if (match) {
              const extruderIdx = parseInt(match[1]);
              if (this.filamentColors && this.filamentColors[extruderIdx]) {
                assignedColor = this.filamentColors[extruderIdx];
              }
            }
            break;
          }
          current = current.parent;
        }

        const applySettings = (m, index) => {
          m.metalness = 0.1;
          m.roughness = 0.7; // Wyższa szorstkość dla lepszego wyglądu plastiku
          m.side = THREE.DoubleSide;
          
          if (assignedColor && !m.vertexColors) {
            m.color.set(assignedColor);
          } else if (!m.vertexColors && m.color && m.color.getHexString() === 'ffffff' && this.defaultColor) {
            m.color.set(this.defaultColor);
          }
        };

        if (child.material) {
          Array.isArray(child.material) ? child.material.forEach((m, i) => applySettings(m, i)) : applySettings(child.material, 0);
        } else {
          child.material = this.modelMaterial;
          console.log(`[Material] Fallback to modelMaterial for mesh '${child.name}'`);
        }

        // 4. Włącz cienie dla widoczności krawędzi
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Zaktualizuj próbnik koloru na podstawie pierwszego faktycznego koloru modelu
    let firstColor = null;
    group.traverse((child) => {
      if (child.isMesh && child.material && !firstColor) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        if (mat && mat.color) {
          firstColor = '#' + mat.color.getHexString();
        }
      }
    });
    if (firstColor) {
      const colorPicker = document.getElementById('model-color-picker');
      if (colorPicker) colorPicker.value = firstColor;
      this.defaultColor = firstColor;
    }

    this.model = group;
    this.scene.add(group);
    this._fitCameraToModel();

    if (progressBar) {
      progressBar.style.transition = 'transform 0.2s ease-out';
      progressBar.style.transform = 'scaleX(1)';
    }
    if (progressText) {
      progressText.textContent = 'Done!';
    }
    // We let the UI finish before hiding the loading div (handled in _openProject)
    await new Promise(r => setTimeout(r, 200));
  }

  /**
   * Pre-process Bambu Studio 3MF files to inject external references directly into
   * the main 3dmodel.model file. This bypasses the ThreeMFLoader limitation
   * that doesn't support the p:path production extension.
   */
  async _preprocessBambu3MF(arrayBuffer, onProgress = null) {
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const modelFile = zip.file('3D/3dmodel.model');
      if (!modelFile) return arrayBuffer;

      const modelXml = await modelFile.async('string');
      const doc = new DOMParser().parseFromString(modelXml, 'text/xml');
      const resources = doc.querySelector('resources');
      if (!resources) return arrayBuffer;

      let needsRepack = false;

      // --- WSTRZYKIWANIE KOLORÓW DO 3DMODEL.MODEL ---
      const allColors = [];
      for (const [path, file] of Object.entries(zip.files)) {
        if (/Metadata\/filament_settings_\d+\.config$/i.test(path)) {
          try {
            const json = JSON.parse(await file.async('string'));
            if (json.filament_colour) {
              const fcStr = Array.isArray(json.filament_colour) ? json.filament_colour.join(',') : String(json.filament_colour);
              fcStr.split(',').forEach(c => {
                let hex = c.trim();
                if (hex) {
                  if (!hex.startsWith('#')) hex = '#' + hex;
                  if (hex.length === 7) hex += 'FF';
                  allColors.push(hex.toUpperCase());
                }
              });
            }
          } catch {}
        }
      }

      const extruderMap = {};
      const modelSettingsFile = zip.file('Metadata/model_settings.config');
      if (modelSettingsFile) {
        const msRaw = await modelSettingsFile.async('string');
        const msDoc = new DOMParser().parseFromString(msRaw, 'text/xml');
        
        msDoc.querySelectorAll('object').forEach(msObj => {
           const objId = msObj.getAttribute('id');
           const modelObj = doc.querySelector(`object[id="${objId}"]`);
           if (!modelObj) return;

           const objMetaArray = Array.from(msObj.children).filter(n => n.tagName === 'metadata' && n.getAttribute('key') === 'extruder');
           let baseExtruder = 0;
           if (objMetaArray.length > 0) baseExtruder = parseInt(objMetaArray[0].getAttribute('value')) - 1;

           extruderMap[objId] = baseExtruder;

           const msParts = Array.from(msObj.children).filter(n => n.tagName === 'part');
           const componentsNode = Array.from(modelObj.children).find(n => n.tagName === 'components');
           if (componentsNode) {
              const compArray = Array.from(componentsNode.children).filter(n => n.tagName === 'component');
              msParts.forEach((part, idx) => {
                 if (idx < compArray.length) {
                    const compId = compArray[idx].getAttribute('objectid');
                    let partExtruder = baseExtruder;
                    const partMeta = Array.from(part.children).filter(n => n.tagName === 'metadata' && n.getAttribute('key') === 'extruder');
                    if (partMeta.length > 0) partExtruder = parseInt(partMeta[0].getAttribute('value')) - 1;
                    
                    extruderMap[compId] = partExtruder;
                 }
              });
           }
        });
      }

      // --- WSTRZYKIWANIE NAZW EXTRUDERÓW DO OBIEKTÓW ---
      if (Object.keys(extruderMap).length > 0) {
        needsRepack = true;
        doc.querySelectorAll('object, component').forEach(obj => {
           const id = obj.getAttribute('id') || obj.getAttribute('objectid');
           if (extruderMap[id] !== undefined) {
              const extruderIdx = extruderMap[id];
              const oldName = obj.getAttribute('name') || '';
              obj.setAttribute('name', `BAMBU_EXTRUDER_${extruderIdx}_${oldName}`);
           }
        });
      }
      // --- KONIEC WSTRZYKIWANIA ---
      const components = doc.querySelectorAll('component');
      const pathsToLoad = new Set();

      components.forEach((c) => {
        const path = c.getAttribute('p:path');
        if (path) {
          needsRepack = true;
          pathsToLoad.add(path.startsWith('/') ? path.substring(1) : path);
          c.removeAttribute('p:path'); // Force local reference
        }
      });

      if (!needsRepack) return arrayBuffer;

      for (const path of pathsToLoad) {
        const extFile = zip.file(path);
        if (extFile) {
          const extXml = await extFile.async('string');
          const extDoc = new DOMParser().parseFromString(extXml, 'text/xml');
          const extObjects = extDoc.querySelectorAll('resources > object');
          extObjects.forEach((obj) => {
            const imported = doc.importNode(obj, true);
            const id = imported.getAttribute('id');
            if (extruderMap && extruderMap[id] !== undefined) {
               const extruderIdx = extruderMap[id];
               const oldName = imported.getAttribute('name') || '';
               imported.setAttribute('name', `BAMBU_EXTRUDER_${extruderIdx}_${oldName}`);
            }
            resources.appendChild(imported);
          });
        }
      }

      const newXml = new XMLSerializer().serializeToString(doc);
      zip.file('3D/3dmodel.model', newXml);
      return await zip.generateAsync({ type: 'arraybuffer' }, (meta) => {
        if (onProgress) onProgress(meta.percent);
      });
    } catch (err) {
      console.warn('Failed to preprocess 3MF for Bambu Studio compatibility:', err);
      return arrayBuffer; // Return original on error
    }
  }

  _fitCameraToModel() {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.8;

    this.camera.position.set(
      center.x + distance * 0.6,
      center.y + distance * 0.5,
      center.z + distance * 0.6
    );
    this.controls.target.copy(center);
    this.controls.update();
  }

  resetCamera() { this._fitCameraToModel(); }

  toggleWireframe() {
    this.wireframe = !this.wireframe;
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) child.material.wireframe = this.wireframe;
      });
    }
    return this.wireframe;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    return this.autoRotate;
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._resizeHandler);
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }
    if (this.renderer) this.renderer.dispose();
  }
}


// ─────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────

class Toast {
  static show(message, type = 'success', duration = 3500, showIcon = true) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    if (showIcon) {
      const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    } else {
      toast.innerHTML = `<span>${message}</span>`;
    }
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// ─────────────────────────────────────
// Utility
// ─────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────
// Main Application
// ─────────────────────────────────────

class App {
  constructor() {
    this.storage = new StorageManager();
    this.viewer = null;
    this.projects = [];
    this.currentProject = null;
    this.deleteTargetId = null;
    this.thumbnailUrls = new Map();
    this.currentView = 'library'; // 'library' or 'trash'
    this.trashFiles = [];
    this.settings = {
      gridColumns: 'auto'
    };
  }

  async init() {
    await this.storage.init();
    const allStored = await this.storage.getAllProjects();
    this.projects = [];
    
    // Sync with server
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const serverFiles = await response.json();
        for (const sf of serverFiles) {
          const local = allStored.find(p => p.fileName === sf.filename);
          if (local) {
            this.projects.push(local);
          } else {
            try {
              const fRes = await fetch(sf.url);
              if (fRes.ok) {
                const blob = await fRes.blob();
                const file = new File([blob], sf.filename, { type: 'application/octet-stream' });
                await this._addFile(file);
              }
            } catch (err) {
              console.error('Error downloading missing file:', sf.filename, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync files from server', err);
    }

    // Load frontend settings
    const storedCols = localStorage.getItem('3mf_settings_gridColumns');
    if (storedCols) {
      this.settings.gridColumns = storedCols;
    }
    this._applySettings();

    // Load backend settings
    try {
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        this.settings.trashDays = sData.trashRetentionDays || 90;
      }
    } catch (e) {
      console.warn('Could not load backend settings', e);
      this.settings.trashDays = 90;
    }

    this._bindEvents();
    this._renderGrid();
    this._updateCounter();
  }

  _applySettings() {
    const grid = document.getElementById('projects-grid');
    if (grid) {
      if (this.settings.gridColumns === 'auto') {
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
      } else {
        grid.style.gridTemplateColumns = `repeat(${this.settings.gridColumns}, 1fr)`;
      }
    }
  }

  _bindEvents() {
    const addFilesBtn = document.getElementById('add-files-btn');
    const fileUpload = document.getElementById('file-upload');
    if (addFilesBtn && fileUpload) {
      addFilesBtn.addEventListener('click', () => {
        fileUpload.click();
      });
      
      fileUpload.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files.length > 0) {
          await this._uploadFiles(e.target.files);
        }
      });
    }

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const saveSettings = document.getElementById('save-settings');
    
    // Custom Select Logic
    const selectSelected = document.querySelector('.select-selected');
    const selectItemsContainer = document.querySelector('.select-items');
    let currentSelectedValue = this.settings.gridColumns;

    if (selectSelected && selectItemsContainer) {
      selectSelected.addEventListener('click', function(e) {
        e.stopPropagation();
        this.classList.toggle('select-arrow-active');
        selectItemsContainer.classList.toggle('select-hide');
      });

      const items = selectItemsContainer.querySelectorAll('div');
      items.forEach(item => {
        item.addEventListener('click', function(e) {
          selectSelected.innerHTML = this.innerHTML;
          currentSelectedValue = this.getAttribute('data-value');
          selectSelected.click();
        });
      });

      document.addEventListener('click', () => {
        selectSelected.classList.remove('select-arrow-active');
        selectItemsContainer.classList.add('select-hide');
      });
    }

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        currentSelectedValue = this.settings.gridColumns;
        if (selectSelected) {
          const activeItem = document.querySelector(`.select-items div[data-value="${currentSelectedValue}"]`);
          if (activeItem) selectSelected.innerHTML = activeItem.innerHTML;
        }
        
        const trashDaysInput = document.getElementById('trash-days-input');
        if (trashDaysInput) {
          trashDaysInput.value = this.settings.trashDays || 90;
        }
        
        settingsModal.classList.remove('hidden');
      });
      closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
      saveSettings.addEventListener('click', async () => {
        if (currentSelectedValue === 'auto') {
          this.settings.gridColumns = 'auto';
        } else {
          const cols = parseInt(currentSelectedValue) || 3;
          this.settings.gridColumns = Math.max(1, Math.min(10, cols));
        }
        localStorage.setItem('3mf_settings_gridColumns', this.settings.gridColumns);
        this._applySettings();
        
        const trashDaysInput = document.getElementById('trash-days-input');
        if (trashDaysInput) {
          let tDays = parseInt(trashDaysInput.value);
          if (isNaN(tDays) || tDays < 1) tDays = 90;
          this.settings.trashDays = tDays;
          
          try {
            await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trashRetentionDays: this.settings.trashDays })
            });
          } catch(e) {
            console.error('Failed to save backend settings', e);
          }
        }
        
        settingsModal.classList.add('hidden');
        Toast.show('Settings saved', 'success', 3500, false);
      });
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
      });
    }

    const trashBtn = document.getElementById('trash-view-btn');
    if (trashBtn) {
      trashBtn.addEventListener('click', async () => {
        if (this.currentView === 'library') {
          this.currentView = 'trash';
          trashBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Library
          `;
          trashBtn.classList.remove('btn-ghost');
          trashBtn.classList.add('btn-primary');
          await this._loadTrash();
        } else {
          this.currentView = 'library';
          trashBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Trash
          `;
          trashBtn.classList.remove('btn-primary');
          trashBtn.classList.add('btn-ghost');
          this._renderGrid();
          this._updateCounter();
        }
      });
    }

    // Drag & drop
    let dragCounter = 0;
    const overlay = document.getElementById('drop-overlay');

    document.body.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      overlay.classList.remove('hidden');
    });
    document.body.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; overlay.classList.add('hidden'); }
    });
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      overlay.classList.add('hidden');
      this._handleFiles(e.dataTransfer.files);
    });

    // Logo click → back to grid
    document.querySelector('.logo').addEventListener('click', () => this._showGridView());
    document.querySelector('.header-left').addEventListener('click', () => this._showGridView());
    document.querySelector('.header-left').style.cursor = 'pointer';

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => this._showGridView());

    // Download
    document.getElementById('download-btn').addEventListener('click', () => this._downloadCurrent());
    const viewerDownloadBtn = document.getElementById('viewer-download-btn');
    if (viewerDownloadBtn) {
      viewerDownloadBtn.addEventListener('click', () => this._downloadCurrent());
    }

    // Viewer controls
    document.getElementById('reset-camera-btn').addEventListener('click', () => {
      if (this.viewer) this.viewer.resetCamera();
    });
    document.getElementById('wireframe-btn').addEventListener('click', (e) => {
      if (this.viewer) e.currentTarget.classList.toggle('active', this.viewer.toggleWireframe());
    });
    document.getElementById('autorotate-btn').addEventListener('click', (e) => {
      if (this.viewer) e.currentTarget.classList.toggle('active', this.viewer.toggleAutoRotate());
    });

    // Delete modal
    document.getElementById('delete-cancel').addEventListener('click', () => {
      document.getElementById('delete-modal').classList.add('hidden');
      this.deleteTargetId = null;
    });
    document.getElementById('delete-confirm').addEventListener('click', async () => {
      if (this.deleteTargetId) {
        await this._deleteProject(this.deleteTargetId);
        this.deleteTargetId = null;
      }
      document.getElementById('delete-modal').classList.add('hidden');
    });
    document.getElementById('delete-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
        this.deleteTargetId = null;
      }
    });

    // Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('delete-modal');
        if (!modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          this.deleteTargetId = null;
        } else if (!document.getElementById('detail-view').classList.contains('hidden')) {
          this._showGridView();
        }
      }
    });
  }

  async _uploadFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.3mf'));
    if (files.length === 0) {
      Toast.show('No .3mf files found', 'error');
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      Toast.show('Uploading files...', 'info', 2000);
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      
      // After successful upload, parse and add to local display
      for (const file of files) {
        try {
          await this._addFile(file);
        } catch (err) {
          console.error('Error parsing file:', file.name, err);
          Toast.show(`Error parsing: ${file.name}`, 'error');
        }
      }
      
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error uploading:', err);
      Toast.show('Upload failed', 'error');
    }
  }

  async _handleFiles(fileList) {
    await this._uploadFiles(fileList);
  }

  async _addFile(file) {
    const existing = this.projects.find((p) => p.fileName === file.name);
    if (existing) {
      Toast.show(`"${file.name}" already exists`, 'error');
      return;
    }

    Toast.show(`Importing: ${file.name}...`, 'info', 2000);

    const parsed = await ThreeMFParser.parse(file);
    const project = {
      id: generateId(),
      fileName: file.name,
      fileSize: file.size,
      dateAdded: new Date().toISOString(),
      thumbnail: parsed.thumbnail,
      settings: parsed.settings,
      profiles: parsed.profiles,
    };

    await this.storage.saveProject(project, parsed.arrayBuffer);
    this.projects.push(project);
    this._renderGrid();
    this._updateCounter();
    Toast.show(`Added: ${file.name}`, 'success');
  }

  async _deleteProject(id) {
    const project = this.projects.find((p) => p.id === id);
    if (project) {
      try {
        await fetch(`/api/files/${encodeURIComponent(project.fileName)}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete from server:', err);
      }
    }
    
    // Do not delete from storage yet, so we keep the thumbnail for the trash view
    this.projects = this.projects.filter((p) => p.id !== id);
    this._renderGrid();
    this._updateCounter();
    Toast.show('Project deleted', 'success');
  }

  _renderGrid() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('empty-state');

    const listToRender = this.currentView === 'trash' ? this.trashFiles : this.projects;

    if (listToRender.length === 0) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
      if (this.currentView === 'trash') {
        empty.querySelector('h2').textContent = 'Trash is empty';
        empty.querySelector('p').textContent = 'Deleted projects will appear here';
      } else {
        empty.querySelector('h2').textContent = 'No Projects';
        empty.querySelector('p').textContent = 'Drag & drop .3mf files here or click "Add Files" to get started';
      }
      return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';

    const sorted = [...listToRender].sort(
      (a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
    );

    for (const item of sorted) {
      grid.appendChild(this._createCard(item));
    }
  }

  _createCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id;

    let thumbnailHtml;
    if (project.thumbnail) {
      let url = this.thumbnailUrls.get(project.id);
      if (!url) {
        url = URL.createObjectURL(project.thumbnail);
        this.thumbnailUrls.set(project.id, url);
      }
      thumbnailHtml = `<img src="${url}" alt="${project.fileName}" loading="lazy">`;
    } else {
      thumbnailHtml = `
        <div class="placeholder-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>`;
    }

    const dateAdded = project.dateAdded ? new Date(project.dateAdded) : new Date();
    const dateStr = dateAdded.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    card.innerHTML = `
      <div class="card-thumbnail">${thumbnailHtml}</div>
      <div class="card-info">
        <div class="card-title" title="${project.fileName}">${project.fileName}</div>
        <div class="card-meta">
          <span class="card-size">${(project.fileSize ? (project.fileSize / 1024 / 1024).toFixed(2) : '0.00')} MB</span>
          <span class="card-date">${dateStr}</span>
        </div>
      </div>
      <div class="card-actions">
        ${this.currentView === 'trash' ? `
          <div class="card-action card-restore" title="Restore" data-filename="${project.filename}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
          </div>
          <div class="card-action card-delete" title="Delete Permanently" data-filename="${project.filename}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </div>
        ` : `
          <div class="card-action card-download" title="Download" data-filename="${project.fileName}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div class="card-action card-delete" title="Delete" data-id="${project.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </div>
        `}
      </div>
    `;

    // Events
    if (this.currentView === 'library') {
      card.addEventListener('click', () => this._openProject(project.id));
      card.querySelector('.card-download').addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = `/files/${encodeURIComponent(project.fileName)}`;
        a.download = project.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        Toast.show(`Downloading: ${project.fileName}`, 'success');
      });
      card.querySelector('.card-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTargetId = project.id;
        document.getElementById('delete-modal-text').textContent =
          `Are you sure you want to move "${project.fileName}" to trash?`;
        document.getElementById('delete-modal').classList.remove('hidden');
      });
    } else {
      // Trash events
      card.querySelector('.card-restore').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const res = await fetch(`/api/trash/${encodeURIComponent(project.filename)}/restore`, { method: 'POST' });
          if (res.ok) {
            Toast.show('Project restored', 'success');
            await this._loadTrash();
            this.init(); // resync library from server
          } else {
            Toast.show('Failed to restore project', 'error');
          }
        } catch(err) { console.error(err); }
      });
      card.querySelector('.card-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to permanently delete "${project.fileName}"? This cannot be undone.`)) {
          try {
            const res = await fetch(`/api/trash/${encodeURIComponent(project.filename)}`, { method: 'DELETE' });
            if (res.ok) {
              if (project.id) {
                await this.storage.deleteProject(project.id);
                if (this.thumbnailUrls.has(project.id)) {
                  URL.revokeObjectURL(this.thumbnailUrls.get(project.id));
                  this.thumbnailUrls.delete(project.id);
                }
              }
              Toast.show('Project permanently deleted', 'success');
              await this._loadTrash();
            }
          } catch(err) { console.error(err); }
        }
      });
    }

    return card;
  }

  async _loadTrash() {
    try {
      const allStored = await this.storage.getAllProjects();
      const res = await fetch('/api/trash');
      if (res.ok) {
        const list = await res.json();
        this.trashFiles = list.map(item => {
          const local = allStored.find(p => p.fileName === item.originalName);
          return {
            id: local ? local.id : null,
            thumbnail: local ? local.thumbnail : null,
            filename: item.filename, // the server ID
            fileName: item.originalName, // for UI
            fileSize: local ? local.fileSize : item.size,
            dateAdded: new Date(parseInt(item.filename.split('_')[0]) || Date.now()) // from timestamp
          };
        });
        this._renderGrid();
        this._updateCounter();
      }
    } catch(err) {
      console.error('Failed to load trash:', err);
    }
  }

  _updateCounter() {
    if (this.currentView === 'trash') {
      const n = this.trashFiles.length;
      document.getElementById('project-count').textContent =
        n === 0 ? 'Trash empty' : n === 1 ? '1 item' : `${n} items`;
    } else {
      const n = this.projects.length;
      document.getElementById('project-count').textContent =
        n === 0 ? '0 projects' : n === 1 ? '1 project' : `${n} projects`;
    }
  }

  async _openProject(id) {
    const project = this.projects.find((p) => p.id === id);
    if (!project) return;

    this.currentProject = project;
    document.getElementById('detail-title').textContent = project.fileName;
    document.getElementById('grid-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    document.getElementById('viewer-loading').classList.remove('hidden');
    document.getElementById('wireframe-btn').classList.remove('active');
    document.getElementById('autorotate-btn').classList.remove('active');

    // Init 3D viewer
    if (this.viewer) this.viewer.destroy();
    const canvas = document.getElementById('viewer-canvas');
    this.viewer = new ModelViewer(canvas);

    try {
      this.viewer.init();
    } catch (err) {
      console.error('Viewer init error:', err);
      Toast.show('Error initializing 3D viewer', 'error');
      document.getElementById('viewer-loading').classList.add('hidden');
      return;
    }

    // Load model
    try {
      const progressBar = document.getElementById('viewer-progress-bar');
      const progressText = document.getElementById('viewer-loading-text');
      if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.transform = 'scaleX(0)';
      }
      if (progressText) progressText.textContent = 'Downloading model...';

      const response = await fetch(`/files/${encodeURIComponent(project.fileName)}`);
      if (!response.ok) throw new Error('File not found on server');

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          const percent = Math.round((loaded / total) * 100);
          if (progressBar) {
             progressBar.style.transition = 'transform 0.1s linear';
             progressBar.style.transform = `scaleX(${percent / 100})`;
          }
          if (progressText) progressText.textContent = `Downloading model... ${percent}%`;
        }
      }

      if (progressText) progressText.textContent = 'Processing 3D model...';
      const fileData = await new Blob(chunks).arrayBuffer();
      
      if (fileData) {
        let color = project.profiles?.color;
        if (!color && project.settings && project.settings.filament_colour) {
          const fcStr = Array.isArray(project.settings.filament_colour) 
            ? project.settings.filament_colour.join(',') 
            : String(project.settings.filament_colour);
          const fc = fcStr.split(',').map(s => s.trim()).filter(Boolean);
          const isBoring = (c) => {
            const u = c.toUpperCase();
            return u.startsWith('#FFFFFF') || u.startsWith('#000000') || u.startsWith('FFFFFF') || u.startsWith('000000');
          };
          const vibrant = fc.find(c => c && !isBoring(c));
          const c = vibrant || fc[0];
          if (c) color = c.slice(0, 7);
          
          this.viewer.filamentColors = fc.map(col => {
             let hex = col;
             if (hex && !hex.startsWith('#')) hex = '#' + hex;
             return hex ? hex.slice(0, 7) : null;
          });
        }
        await this.viewer.loadModel(fileData, color);
      }
    } catch (err) {
      console.error('Error loading 3D model:', err);
      Toast.show('Error loading 3D model', 'error');
    } finally {
      document.getElementById('viewer-loading').classList.add('hidden');
    }
  }

  _showGridView() {
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('grid-view').classList.remove('hidden');
    if (this.viewer) { this.viewer.destroy(); this.viewer = null; }
    this.currentProject = null;
  }

  async _downloadCurrent() {
    if (!this.currentProject) return;
    try {
      const a = document.createElement('a');
      a.href = `/files/${encodeURIComponent(this.currentProject.fileName)}`;
      a.download = this.currentProject.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      Toast.show(`Downloaded: ${this.currentProject.fileName}`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      Toast.show('Download error', 'error');
    }
  }
}

// ─────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────

const app = new App();
app.init().catch((err) => {
  console.error('App initialization error:', err);
});
