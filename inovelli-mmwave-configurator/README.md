# Inovelli mmWave Zone Configurator

A Home Assistant add-on that provides a visual interface for configuring mmWave detection zones on Inovelli VZM32-SN Blue Series mmWave Presence Dimmer switches.

## Features

- **Visual Zone Editor**: Interactive top-down and side view canvases for adjusting detection zone boundaries
- **Room Setup**: Configure room dimensions and sensor mounting height
- **Detection Settings**: Adjust sensitivity, detection delay, and hold time
- **Device Management**: Discover and select from multiple VZM32-SN devices
- **Real-time Sync**: Read current values from and write new values to your devices

## Installation

1. Add this repository to your Home Assistant Add-on Store
2. Install the "Inovelli mmWave Zone Configurator" add-on
3. Start the add-on
4. Click "Open Web UI" or access via the sidebar

## Configuration

### Home Assistant Connection

The add-on requires a long-lived access token to communicate with Home Assistant:

1. Go to your Home Assistant profile (click your username in the sidebar)
2. Scroll down to "Long-Lived Access Tokens"
3. Click "Create Token" and give it a name
4. Copy the token and paste it into the add-on settings

### Device Requirements

This add-on works with Inovelli VZM32-SN Blue Series mmWave Presence Dimmer switches that are:
- Connected to Home Assistant via ZHA (Zigbee Home Automation)
- Using a ZHA quirk that exposes the mmWave configuration entities

The following number entities must be exposed for each device:
- `number.<device>_mmwave_width_minimum_left`
- `number.<device>_mmwave_width_maximum_right`
- `number.<device>_mmwave_depth_minimum_near`
- `number.<device>_mmwave_depth_maximum_far`
- `number.<device>_mmwave_height_minimum_floor`
- `number.<device>_mmwave_height_maximum_ceiling`
- `number.<device>_mmwave_detection_sensitivity`
- `number.<device>_mmwave_detection_delay`
- `number.<device>_mmwave_hold_time`

## Usage

1. **Setup Room Dimensions**: Enter your room's width, depth, and height in centimeters. Also set the sensor mounting height.

2. **Select Device**: Choose your VZM32-SN device from the dropdown.

3. **Read Current Values**: Click "Read from Device" to load the current zone configuration.

4. **Adjust Zone**: Use the visual editors to drag the zone boundaries, or enter precise values in the numeric inputs.

5. **Configure Detection**: Set sensitivity (Low/Medium/High), detection delay (5s/1s/0.2s), and hold time (1-300 seconds).

6. **Write to Device**: Click "Write to Device" to save your configuration.

## Zone Coordinate System

- **X axis**: Left/Right relative to sensor (negative = left, positive = right)
- **Y axis**: Depth from sensor (0 = at sensor, positive = into room)
- **Z axis**: Height relative to sensor (negative = below sensor, positive = above sensor)

All values are in centimeters.

## Development

### Local Development

```bash
cd frontend
npm install
npm run dev
```

### Building

```bash
cd frontend
npm run build
```

## License

MIT
