# Build: Inovelli VZM32-SN mmWave Zone Configurator

Build a Home Assistant add-on that provides a visual interface for configuring mmWave detection zones on Inovelli VZM32-SN switches. Model it after https://github.com/EverythingSmartHome/everything-presence-addons

## Target Device
- Inovelli VZM32-SN Blue Series mmWave Presence Dimmer
- Zigbee device using ZHA integration
- Has mmWave zone boundary attributes on cluster 0xFC32

## mmWave Zone Attributes (Cluster 0xFC32)
All values are in centimeters, relative to sensor position:

| Attribute | Description | Range |
|-----------|-------------|-------|
| mmwave_x_min | Left boundary | int16 |
| mmwave_x_max | Right boundary | int16 |
| mmwave_y_min | Near boundary (0 = at sensor) | int16 |
| mmwave_y_max | Far boundary | int16 |
| mmwave_z_min | Floor boundary (negative = below sensor) | int16 |
| mmwave_z_max | Ceiling boundary (positive = above sensor) | int16 |
| mmwave_detect_sensitivity | 0=Low, 1=Medium, 2=High | 0-2 |
| mmwave_detect_trigger | 0=5s delay, 1=1s delay, 2=0.2s fast | 0-2 |
| mmwave_hold_time | Seconds before occupancy clears | uint32 |

## Features Required

### 1. Room Setup
- Input room dimensions (width, depth, height) in cm or ft/in
- Set sensor mounting height on wall
- Sensor is always centered on one wall facing into room

### 2. Visual Zone Editor
- **Top-down view (X-Y plane)**: Shows room from above, sensor at top center, detection zone as draggable rectangle
- **Side view (Y-Z plane)**: Shows room from side, sensor on left wall, detection zone showing height boundaries
- Drag handles on zone boundaries for interactive adjustment
- Grid overlay with measurement labels
- Show sensor FOV cone (~100° horizontal)

### 3. Settings Panel
- Sensitivity: Radio buttons (Low/Medium/High)
- Detection Delay: Radio buttons (5s/1s/0.2s)  
- Hold Time: Slider (1-300 seconds)
- Numeric inputs for precise zone boundary values

### 4. Home Assistant Integration
- Connect via WebSocket API (ws://homeassistant.local:8123/api/websocket)
- Authenticate with long-lived access token
- Discover VZM32-SN devices from ZHA
- Read current values from device entities
- Write values using number.set_value service

### 5. Device Management
- Dropdown to select from multiple VZM32-SN devices
- Show device name and area
- Read/Write buttons

## Entity ID Pattern
The ZHA quirk exposes these as number entities:
```
number.<device>_mmwave_width_minimum_left
number.<device>_mmwave_width_maximum_right
number.<device>_mmwave_depth_minimum_near
number.<device>_mmwave_depth_maximum_far
number.<device>_mmwave_height_minimum_floor
number.<device>_mmwave_height_maximum_ceiling
number.<device>_mmwave_detection_sensitivity
number.<device>_mmwave_detection_delay
number.<device>_mmwave_hold_time
```

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS
- Build: Vite
- Canvas API for zone visualization
- Home Assistant WebSocket API for device communication
- Package as HA add-on (Docker container)

## Add-on Structure
```
inovelli-mmwave-configurator/
├── config.yaml              # HA add-on manifest
├── Dockerfile
├── run.sh
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── RoomSetup.tsx
│   │   │   ├── TopDownView.tsx
│   │   │   ├── SideView.tsx
│   │   │   ├── ZoneControls.tsx
│   │   │   └── DeviceSelector.tsx
│   │   ├── hooks/
│   │   │   └── useHomeAssistant.ts
│   │   └── types.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

## config.yaml (Add-on manifest)
```yaml
name: "Inovelli mmWave Zone Configurator"
description: "Visual zone editor for Inovelli VZM32-SN mmWave switches"
version: "1.0.0"
slug: "inovelli-mmwave-configurator"
arch:
  - amd64
  - aarch64
  - armv7
ports:
  8099/tcp: 8099
ports_description:
  8099/tcp: "Web UI"
ingress: true
ingress_port: 8099
homeassistant_api: true
auth_api: true
```

## Implementation Steps

1. **Create React app with Vite + TypeScript + Tailwind**

2. **Build static UI first:**
   - Room dimension inputs
   - Canvas-based top-down view with draggable zone
   - Canvas-based side view with draggable zone
   - Settings controls

3. **Add Home Assistant WebSocket connection:**
   - Auth flow with token
   - Subscribe to entity states
   - Call services to update values

4. **Device discovery:**
   - Query for entities matching `number.*_mmwave_*`
   - Group by device
   - Build device selector

5. **Package as Docker add-on:**
   - nginx or simple static server
   - Dockerfile
   - HA add-on config

## UI Layout
```
+--------------------------------------------------+
| Inovelli mmWave Zone Configurator                |
| Device: [=========== Dropdown ==============] 🔄 |
+--------------------------------------------------+
|  TOP-DOWN VIEW          |  SIDE VIEW             |
|  (drag zone edges)      |  (drag zone edges)     |
|                         |                        |
|    +-----------+        |  +-------------+       |
|    |   ZONE    |        |  |    ZONE     |       |
|    |           |        |  |             |       |
|    |     *     |        |  *             |       |
|    +-----------+        |  +-------------+       |
|       sensor            |     sensor             |
+--------------------------------------------------+
| ROOM         | ZONE BOUNDS      | DETECTION      |
| W: [400] cm  | X: [-150] [150]  | Sens: (L)(M)(H)|
| D: [500] cm  | Y: [0]    [400]  | Delay:(5)(1)(.2)|
| H: [280] cm  | Z: [-100] [160]  | Hold: [===30s] |
| Sensor:[120] |                  |                |
+--------------------------------------------------+
|        [Read from Device]  [Write to Device]     |
+--------------------------------------------------+
```

Start building!
